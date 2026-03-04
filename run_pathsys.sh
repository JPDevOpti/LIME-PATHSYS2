#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FRONT_DIR="$SCRIPT_DIR/Front-End"
BACK_DIR="$SCRIPT_DIR/Back-End"
ENV_FILE="$BACK_DIR/.env"
RUNNER_ENV_FILE="$SCRIPT_DIR/.pathsys.runner.env"

LOCAL_MONGODB_URI="mongodb://localhost:27017"
DATABASE_NAME="pathsys"

ATLAS_MONGODB_URI="${ATLAS_MONGODB_URI:-}"


log() {
    echo "[PATHSYS] $*"
}

load_atlas_config() {
    if [ -f "$RUNNER_ENV_FILE" ]; then
        if [ -z "$ATLAS_MONGODB_URI" ]; then
            ATLAS_MONGODB_URI="$(grep -E '^ATLAS_MONGODB_URI=' "$RUNNER_ENV_FILE" | tail -n 1 | cut -d '=' -f 2- || true)"
        fi
    fi
}

require_dir() {
    local dir="$1"
    local name="$2"
    if [ ! -d "$dir" ]; then
        echo "Error: $name directory not found at $dir"
        exit 1
    fi
}

ensure_backend_venv() {
    local venv_dir="$BACK_DIR/.venv"
    local venv_python="$venv_dir/bin/python"

    if [ ! -d "$venv_dir" ] || [ ! -x "$venv_python" ]; then
        rm -rf "$venv_dir"
        python3 -m venv "$venv_dir"
    fi

    if ! "$venv_python" -c "import sys; print(sys.executable)" >/dev/null 2>&1; then
        log "Detected broken virtualenv, recreating..."
        rm -rf "$venv_dir"
        python3 -m venv "$venv_dir"
    fi
}

set_backend_env() {
    local mongodb_uri="$1"
    local database_name="$2"

    mkdir -p "$BACK_DIR"
    touch "$ENV_FILE"

    local tmp_file
    tmp_file="$(mktemp)"

    grep -Ev '^(MONGODB_URI|DATABASE_NAME)=' "$ENV_FILE" > "$tmp_file" || true
    {
        cat "$tmp_file"
        echo "MONGODB_URI=$mongodb_uri"
        echo "DATABASE_NAME=$database_name"
    } > "$ENV_FILE"

    rm -f "$tmp_file"
}

setup() {
    log "Installing dependencies..."

    if [ -d "$FRONT_DIR" ]; then
        log "Installing Front-End dependencies"
        (cd "$FRONT_DIR" && npm install)
    else
        log "Front-End directory not found, skipping"
    fi

    if [ -d "$BACK_DIR" ]; then
        log "Installing Back-End dependencies"
        ensure_backend_venv
        "$BACK_DIR/.venv/bin/python" -m pip install --upgrade pip -q
        "$BACK_DIR/.venv/bin/python" -m pip install -r "$BACK_DIR/requirements.txt" -q
    else
        log "Back-End directory not found, skipping"
    fi

    log "Setup complete"
}

run_imports() {
    require_dir "$BACK_DIR" "Back-End"

    ensure_backend_venv

    log "Running database imports"
    (
        cd "$BACK_DIR"
        "$BACK_DIR/.venv/bin/python" scripts/import_entities.py
        "$BACK_DIR/.venv/bin/python" scripts/import_tests.py
        "$BACK_DIR/.venv/bin/python" scripts/import_cie10_from_csv.py || log "Warning: CIE-10 import failed, continuing"
        "$BACK_DIR/.venv/bin/python" scripts/import_cieo_from_csv.py || log "Warning: CIE-O import failed, continuing"
        "$BACK_DIR/.venv/bin/python" scripts/import_pathologists.py
        "$BACK_DIR/.venv/bin/python" scripts/import_administrators.py
    )

    log "Imports complete"
}

start_services() {
    local mode="$1"

    require_dir "$BACK_DIR" "Back-End"
    require_dir "$FRONT_DIR" "Front-End"

    if pgrep -f "$BACK_DIR/.venv/bin/python run.py" >/dev/null 2>&1 || pgrep -f "$FRONT_DIR/node_modules/.bin/next dev" >/dev/null 2>&1 || pgrep -f "next dev" >/dev/null 2>&1; then
        log "Existing services detected, stopping first..."
        stop_services
    fi

    rm -f "$SCRIPT_DIR/.pathsys.pids" 2>/dev/null || true

    ensure_backend_venv

    case "$mode" in
        local)
            set_backend_env "$LOCAL_MONGODB_URI" "$DATABASE_NAME"
            log "Back-End configured for local MongoDB ($LOCAL_MONGODB_URI, DB: $DATABASE_NAME)"
            ;;
        atlas)
            load_atlas_config
            if [ -z "$ATLAS_MONGODB_URI" ]; then
                echo "Error: ATLAS_MONGODB_URI is not set (env var or .pathsys.runner.env)."
                echo "Example: ATLAS_MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/' $0 atlas"
                exit 1
            fi
            set_backend_env "$ATLAS_MONGODB_URI" "$DATABASE_NAME"
            log "Back-End configured for Atlas (DB: $DATABASE_NAME)"
            ;;
        *)
            echo "Error: Unknown mode '$mode'"
            exit 1
            ;;
    esac

    log "Starting Back-End on port 8000"
    (cd "$BACK_DIR" && .venv/bin/python run.py) &
    sleep 2

    log "Starting Front-End on port 3001 (low-memory mode)"
    (cd "$FRONT_DIR" && npm run dev) &

    log "Services started: Front-End http://localhost:3001 | Back-End http://localhost:8000"
}

stop_services() {
    log "Stopping services..."

    rm -f "$SCRIPT_DIR/.pathsys.pids" 2>/dev/null || true

    pkill -f "$BACK_DIR/.venv/bin/python run.py" 2>/dev/null || true
    pkill -f "uvicorn.*8000" 2>/dev/null || true
    pkill -f "$FRONT_DIR/node_modules/.bin/next dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    log "Services stopped"
}

show_help() {
    cat <<EOF
PATHSYS - Command Runner

Usage:
    $0 <command>

Commands:
    setup   Install dependencies only (Front-End + Back-End)
    import  Run DB imports (entities, tests, CIE-10, CIE-O, pathologists, administrators)
    local   Run app with local MongoDB (mongodb://localhost:27017, DB: pathsys)
    atlas   Run app with MongoDB Atlas (requires ATLAS_MONGODB_URI)
    stop    Stop Front-End and Back-End services
    help    Show this help message

Examples:
    $0 setup
    $0 import
    $0 local
    $0 help

Atlas example:
  ATLAS_MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/' $0 atlas

You can also define this in .pathsys.runner.env:
    ATLAS_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
EOF
}

case "${1:-help}" in
    setup)
        setup
        ;;
    import)
        run_imports
        ;;
    local)
        start_services "local"
        ;;
    atlas)
        start_services "atlas"
        ;;
    stop)
        stop_services
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        echo "Error: unknown command '${1:-}'"
        echo
        show_help
        exit 1
        ;;
esac
