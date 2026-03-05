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

write_backend_env() {
    local mongodb_uri="$1"
    local mode="$2"

    mkdir -p "$BACK_DIR"

    # Preservar SECRET_KEY si ya existe (no sobreescribir un secreto configurado)
    local secret_key=""
    if [ -f "$ENV_FILE" ]; then
        secret_key="$(grep -E '^SECRET_KEY=' "$ENV_FILE" | tail -n 1 | cut -d'=' -f2- || true)"
    fi

    {
        echo "# Generado por run.sh - modo: $mode"
        echo "MONGODB_URI=$mongodb_uri"
        echo "DATABASE_NAME=$DATABASE_NAME"
        echo "ENVIRONMENT=development"
        echo "CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001"
        if [ -n "$secret_key" ]; then
            echo "SECRET_KEY=$secret_key"
        fi
    } > "$ENV_FILE"

    log "Back-End .env escrito (modo: $mode, DB: $DATABASE_NAME)"
}

write_frontend_env() {
    local api_url="$1"

    {
        echo "# Generado por run.sh"
        echo "NEXT_PUBLIC_API_URL=$api_url"
    } > "$FRONT_DIR/.env.local"

    log "Front-End .env.local escrito: NEXT_PUBLIC_API_URL=$api_url"
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


start_services() {
    local mode="$1"

    require_dir "$BACK_DIR" "Back-End"
    require_dir "$FRONT_DIR" "Front-End"

    # Siempre detener servicios previos y esperar a que los puertos queden libres
    stop_services

    ensure_backend_venv

    local backend_uri=""

    case "$mode" in
        local)
            backend_uri="$LOCAL_MONGODB_URI"
            write_backend_env "$backend_uri" "local"
            write_frontend_env "http://localhost:8000"
            ;;
        atlas)
            load_atlas_config
            if [ -z "$ATLAS_MONGODB_URI" ]; then
                echo "Error: ATLAS_MONGODB_URI no está configurado."
                echo "Defínelo en .pathsys.runner.env o como variable de entorno:"
                echo "  ATLAS_MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/' $0 atlas"
                exit 1
            fi
            backend_uri="$ATLAS_MONGODB_URI"
            write_backend_env "$backend_uri" "atlas"
            write_frontend_env "http://localhost:8000"
            ;;
        *)
            echo "Error: modo desconocido '$mode'"
            exit 1
            ;;
    esac

    log "Iniciando Back-End en puerto 8000 (modo: $mode)"
    # Todas las variables críticas se pasan explícitamente al proceso
    (cd "$BACK_DIR" && \
        MONGODB_URI="$backend_uri" \
        DATABASE_NAME="$DATABASE_NAME" \
        ENVIRONMENT=development \
        CORS_ORIGINS="http://localhost:3001,http://127.0.0.1:3001,http://0.0.0.0:3001" \
        .venv/bin/python run.py 2>&1) &
    local backend_pid=$!

    # Esperar hasta que el puerto 8000 esté activo (máx 15 seg)
    local i=0
    while ! lsof -ti:8000 >/dev/null 2>&1; do
        i=$((i + 1))
        if [ "$i" -ge 30 ]; then
            echo "Error: el Back-End no levantó en 15 segundos. Revisa los logs."
            exit 1
        fi
        sleep 0.5
    done
    log "Back-End listo (PID $backend_pid)"

    log "Iniciando Front-End en puerto 3001"
    (cd "$FRONT_DIR" && npm run dev) &

    log "Servicios activos → Front-End: http://localhost:3001 | Back-End: http://localhost:8000"
}

wait_port_free() {
    local port="$1"
    local attempts=20
    local i=0
    while lsof -ti:"$port" >/dev/null 2>&1; do
        i=$((i + 1))
        if [ "$i" -ge "$attempts" ]; then
            log "Advertencia: el puerto $port sigue ocupado después de ${attempts} intentos, forzando..."
            lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
            sleep 1
            return
        fi
        sleep 0.5
    done
}

stop_services() {
    log "Deteniendo servicios..."

    rm -f "$SCRIPT_DIR/.pathsys.pids" 2>/dev/null || true

    pkill -f "$BACK_DIR/.venv/bin/python run.py" 2>/dev/null || true
    pkill -f "uvicorn.*8000" 2>/dev/null || true
    pkill -f "$FRONT_DIR/node_modules/.bin/next dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    # Esperar a que los puertos queden libres antes de continuar
    wait_port_free 8000
    wait_port_free 3001

    log "Servicios detenidos"
}

show_help() {
    cat <<EOF
PATHSYS - Command Runner

Usage:
    $0 <command>

Commands:
    setup   Install dependencies only (Front-End + Back-End)
    local   Run app with local MongoDB (mongodb://localhost:27017, DB: pathsys)
    atlas   Run app with MongoDB Atlas (requires ATLAS_MONGODB_URI)
    stop    Stop Front-End and Back-End services
    help    Show this help message

Examples:
    $0 setup
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
