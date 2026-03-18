#!/bin/bash
set -e

# ==============================================================================
# Script para copiar (clonar) la base de datos remota de MongoDB Atlas a local.
# ¡IMPORTANTE! Este script SOLO LEE de la base de datos remota.
# La base de datos local 'pathsys' SERÁ SOBRESCRITA COMPLETAMENTE.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.pathsys.runner.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No se encontró el archivo $ENV_FILE"
    exit 1
fi

# Cargar variables de entorno
source "$ENV_FILE"

if [ -z "$ATLAS_MONGODB_URI" ]; then
    echo "❌ Error: ATLAS_MONGODB_URI no está definido en $ENV_FILE"
    exit 1
fi

DB_NAME="pathsys"
LOCAL_URI="mongodb://localhost:27017"

# Crear directorio temporal para el volcado
TEMP_DUMP_DIR=$(mktemp -d)

echo "================================================================"
echo "⚠️  ADVERTENCIA IMPORTANTE:"
echo "   Esto va a SOBRESCRIBIR completamente tu base de datos"
echo "   local '$DB_NAME'."
echo "   ------------------------------------------------------------"
echo "   La base de datos REMOTA NO SERÁ TOCADA (solo lectura)."
echo "================================================================"
read -p "¿Estás seguro de que quieres clonar la BD remota a local? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "🛑 Operación cancelada."
    rm -rf "$TEMP_DUMP_DIR"
    exit 0
fi

echo ""
echo "📥 1. Descargando copia de seguridad desde MongoDB Atlas (Solo lectura)..."
# mongodump con --uri y --db extrae únicamente la BD indicada
mongodump --uri="$ATLAS_MONGODB_URI" --db="$DB_NAME" --out="$TEMP_DUMP_DIR"

if [ ! -d "${TEMP_DUMP_DIR}/${DB_NAME}" ]; then
    echo "❌ Error: La extracción de la base de datos remota falló o la BD está vacía."
    echo "No se realizó ningún cambio en tu base de datos local."
    rm -rf "$TEMP_DUMP_DIR"
    exit 1
fi

echo ""
echo "📤 2. Restaurando los datos en la base de datos local..."
echo "     (Eliminando las colecciones existentes para asegurar una copia 1:1)"
# mongorestore con --drop elimina la colección local antes de restaurarla desde el dump
mongorestore --uri="$LOCAL_URI" --db="$DB_NAME" --drop "${TEMP_DUMP_DIR}/${DB_NAME}"

echo ""
echo "🧹 3. Limpiando archivos temporales..."
rm -rf "$TEMP_DUMP_DIR"

echo ""
echo "✅ ¡Clonación completada con éxito!"
echo "Tu base de datos local '$DB_NAME' ahora es una copia 1:1 de Atlas."
