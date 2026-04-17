#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FRONT_DIR="$SCRIPT_DIR/Front-End"
BACK_DIR="$SCRIPT_DIR/Back-End"
ENV_FILE="$BACK_DIR/.env"
RUNNER_ENV_FILE="$SCRIPT_DIR/.env"

LOCAL_MONGODB_URI="mongodb://mongo:27017"
DATABASE_NAME="${DATABASE_NAME:-pathsys}"
FRONTEND_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8002}"
SECRET_KEY_DEFAULT="dev-secret-key-please-change-in-prod-32-chars-min"
COMPOSE_BASE_FILE="docker-compose.yml"
COMPOSE_DEV_FILE="docker-compose.dev.yml"

ATLAS_MONGODB_URI="${ATLAS_MONGODB_URI:-}"

log() {
    echo "[PATHSYS] $*"
}

require_dir() {
    local dir="$1"
    local name="$2"
    if [ ! -d "$dir" ]; then
        echo "Error: $name directory not found at $dir"
        exit 1
    fi
}

require_cmd() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "Error: comando requerido no encontrado: $cmd"
        exit 1
    fi
}

require_docker() {
    require_cmd docker
    if ! docker info >/dev/null 2>&1; then
        echo "Error: Docker no está disponible. Inicia el daemon y vuelve a intentar."
        exit 1
    fi
    if ! docker compose version >/dev/null 2>&1; then
        echo "Error: docker compose no está disponible."
        exit 1
    fi
}

compose_cmd() {
    docker compose -f "$COMPOSE_BASE_FILE" -f "$COMPOSE_DEV_FILE" "$@"
}

cleanup_legacy_named_containers() {
    local legacy_containers=("pathsys-mongo" "pathsys-backend" "pathsys-frontend")
    local c

    for c in "${legacy_containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | rg -x "$c" >/dev/null 2>&1; then
            log "Removiendo contenedor legacy en conflicto: $c"
            docker rm -f "$c" >/dev/null 2>&1 || true
        fi
    done
}

free_port_if_busy() {
    local port="$1"
    local pids=""

    if command -v ss >/dev/null 2>&1; then
        pids="$(ss -ltnp "sport = :$port" 2>/dev/null | awk -F 'pid=' 'NR>1 {split($2,a,","); if (a[1] ~ /^[0-9]+$/) print a[1]}' | sort -u | xargs || true)"
    fi

    if [ -z "$pids" ] && command -v lsof >/dev/null 2>&1; then
        pids="$(lsof -ti:"$port" 2>/dev/null | xargs || true)"
    fi

    if [ -z "$pids" ]; then
        return 0
    fi

    log "Liberando puerto $port (PID(s): $pids)"
    kill -TERM $pids >/dev/null 2>&1 || true
    sleep 1
    kill -KILL $pids >/dev/null 2>&1 || true
}

free_required_ports() {
    free_port_if_busy 8002
    free_port_if_busy 3002
    free_port_if_busy 27017
}

load_atlas_config() {
    if [ -f "$RUNNER_ENV_FILE" ] && [ -z "$ATLAS_MONGODB_URI" ]; then
        ATLAS_MONGODB_URI="$(grep -E '^ATLAS_MONGODB_URI=' "$RUNNER_ENV_FILE" | tail -n 1 | cut -d '=' -f 2- || true)"
    fi
}

write_backend_env() {
    local mongodb_uri="$1"
    local mode="$2"
    local secret_key="${SECRET_KEY:-$SECRET_KEY_DEFAULT}"

    {
        echo "# Generado por run.sh - modo: $mode"
        echo "MONGODB_URI=$mongodb_uri"
        echo "DATABASE_NAME=$DATABASE_NAME"
        echo "ENVIRONMENT=development"
        echo "API_HOST=0.0.0.0"
        echo "API_PORT=8002"
        echo "CORS_ORIGINS=http://localhost:3002,http://127.0.0.1:3002,http://0.0.0.0:3002"
        echo "SECRET_KEY=$secret_key"
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

compose_up() {
    local mode="$1"
    local mongodb_uri="$2"
    local build_flag="$3"

    local compose_args=()
    if [ "$build_flag" = "1" ]; then
        compose_args+=(--build)
    fi

    if [ "$mode" = "atlas" ]; then
        MONGODB_URI="$mongodb_uri" DATABASE_NAME="$DATABASE_NAME" NEXT_PUBLIC_API_URL="$FRONTEND_API_URL" \
            compose_cmd up -d "${compose_args[@]}" backend frontend
    else
        MONGODB_URI="$mongodb_uri" DATABASE_NAME="$DATABASE_NAME" NEXT_PUBLIC_API_URL="$FRONTEND_API_URL" \
            compose_cmd up -d "${compose_args[@]}" mongo backend frontend
    fi
}

stream_service_logs() {
    local mode="$1"

    log "Mostrando logs en vivo (Ctrl+C para salir de la vista de logs)."
    log "Para detener servicios usa: ./run.sh stop"

    if [ "$mode" = "atlas" ]; then
        compose_cmd logs -f --tail=100 backend frontend
    else
        compose_cmd logs -f --tail=100 mongo backend frontend
    fi
}

setup() {
    require_dir "$BACK_DIR" "Back-End"
    require_dir "$FRONT_DIR" "Front-End"
    require_docker

    log "Preparando imágenes Docker..."
    compose_cmd pull mongo || true
    compose_cmd build backend frontend
    log "Setup completo"
}

start_services() {
    local mode="$1"
    local backend_uri=""

    require_dir "$BACK_DIR" "Back-End"
    require_dir "$FRONT_DIR" "Front-End"
    require_docker

    cleanup_legacy_named_containers
    stop_services
    free_required_ports

    case "$mode" in
        local)
            backend_uri="$LOCAL_MONGODB_URI"
            write_backend_env "$backend_uri" "local"
            write_frontend_env "$FRONTEND_API_URL"
            log "Iniciando stack Docker (modo: local)"
            compose_up "local" "$backend_uri" "1"
            ;;
        atlas)
            load_atlas_config
            if [ -z "$ATLAS_MONGODB_URI" ]; then
                echo "Error: ATLAS_MONGODB_URI no está configurado."
                echo "Defínelo en .env o como variable de entorno:"
                echo "  ATLAS_MONGODB_URI='mongodb+srv://juanpablorestrepo2020:HHa1Vk7EjHJAXRbT@cluster0.myvykk4.mongodb.net/' $0 atlas"
                exit 1
            fi
            backend_uri="$ATLAS_MONGODB_URI"
            write_backend_env "$backend_uri" "atlas"
            write_frontend_env "$FRONTEND_API_URL"
            log "Iniciando stack Docker (modo: atlas)"
            compose_up "atlas" "$backend_uri" "1"
            ;;
        *)
            echo "Error: modo desconocido '$mode'"
            exit 1
            ;;
    esac

    log "Servicios activos → Front-End: http://localhost:3002 | Back-End: http://localhost:8002"
    stream_service_logs "$mode"
}

clone_db() {
    load_atlas_config
    require_docker

    if [ -z "$ATLAS_MONGODB_URI" ]; then
        echo "Error: ATLAS_MONGODB_URI no está configurado."
        echo "Defínelo en .env o como variable de entorno:"
        echo "  ATLAS_MONGODB_URI='mongodb+srv://juanpablorestrepo2020:HHa1Vk7EjHJAXRbT@cluster0.myvykk4.mongodb.net/' $0 clone-db"
        exit 1
    fi

    log "================================================================"
    log "ADVERTENCIA: La base de datos local '$DATABASE_NAME' será SOBRESCRITA."
    log "La base de datos remota (Atlas) NO será modificada (solo lectura)."
    log "================================================================"
    read -rp "[PATHSYS] ¿Confirmas la clonación de Atlas → local? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "Operación cancelada."
        exit 0
    fi

    log "Asegurando MongoDB local en Docker..."
    compose_cmd up -d mongo

    log "Clonando Atlas -> Mongo local Docker..."
    docker run --rm mongo:7 sh -lc "mongodump --uri='$ATLAS_MONGODB_URI' --db='$DATABASE_NAME' --archive" \
        | compose_cmd exec -T mongo sh -lc "mongorestore --uri='mongodb://localhost:27017' --db='$DATABASE_NAME' --drop --archive"

    log "Clonacion completada. '$DATABASE_NAME' local es ahora copia 1:1 de Atlas."
}

stop_services() {
    if ! command -v docker >/dev/null 2>&1; then
        log "Docker no está instalado. No hay servicios Docker para detener."
        return 0
    fi

    if ! docker info >/dev/null 2>&1; then
        log "Docker daemon no está activo. No hay servicios Docker para detener."
        return 0
    fi

    log "Deteniendo servicios Docker..."
    compose_cmd down --remove-orphans >/dev/null 2>&1 || true
    cleanup_legacy_named_containers
    log "Servicios detenidos"
}

show_help() {
    cat <<EOF
PATHSYS - Command Runner

Usage:
    $0 <command>

Commands:
    setup     Build de imágenes Docker (Front-End + Back-End)
    local     Run app with local MongoDB Docker (DB: pathsys)
    atlas     Run app with MongoDB Atlas (requires ATLAS_MONGODB_URI)
    clone-db  Copy Atlas database to local MongoDB Docker (mirror 1:1, overwrites local)
    stop      Stop Front-End, Back-End and MongoDB Docker services
    help      Show this help message

Examples:
    $0 setup
    $0 local
    $0 help

Atlas example:
  ATLAS_MONGODB_URI='mongodb+srv://juanpablorestrepo2020:HHa1Vk7EjHJAXRbT@cluster0.myvykk4.mongodb.net/' $0 atlas

You can also define this in .env:
    ATLAS_MONGODB_URI=mongodb+srv://juanpablorestrepo2020:HHa1Vk7EjHJAXRbT@cluster0.myvykk4.mongodb.net/
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
    clone-db)
        clone_db
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
