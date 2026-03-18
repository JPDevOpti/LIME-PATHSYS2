#!/bin/bash

# Este script copia exactamente la base de datos "pathsys" (no la legacy)
# de MongoDB Atlas a tu base de datos local (MongoDB en localhost).
# No modifica ABSOLUTAMENTE NADA en la base de datos de Atlas.
# Los datos locales existentes en "pathsys" serán reemplazados (copia 1 a 1).

# Variables de conexión
REMOTE_URI="mongodb+srv://juanpablorestrepo2020:RwDzfZCJskMeCiBP@cluster0.myvykk4.mongodb.net/"
LOCAL_URI="mongodb://localhost:27017"
DB_NAME="pathsys"

echo "============================================================"
echo "Iniciando clonación de la base de datos '$DB_NAME' desde Atlas"
echo "Origen: Atlas (cluster0.myvykk4.mongodb.net)"
echo "Destino: Localhost (mongodb://localhost:27017)"
echo "============================================================"
echo -e "\nAVISO: Esta operación borrará y reemplazará colecciones en tu base de datos local."
read -p "¿Estás seguro que deseas continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operación cancelada."
    exit 1
fi

# 1. Crear directorio temporal para el volcado (dump)
DUMP_DIR=$(mktemp -d)
echo "[1/3] Directorio temporal creado en: $DUMP_DIR"

# 2. Descargar la base de datos de Atlas usando mongodump
echo "[2/3] Exportando base de datos desde MongoDB Atlas (esto puede tomar unos minutos dependiendo del tamaño)..."
mongodump --uri="$REMOTE_URI" --db="$DB_NAME" --out="$DUMP_DIR"

if [ $? -ne 0 ]; then
    echo "❌ Error: Falló al exportar la base de datos desde Atlas. Verifica tu conexión a internet o URI."
    rm -rf "$DUMP_DIR"
    exit 1
fi

echo "✔ Exportación completada."

# 3. Restaurar la base de datos en local usando mongorestore
echo "[3/3] Restaurando base de datos en local (modidad 1 a 1)..."
# El modificador --drop borra cada colección antes de restaurarla, asegurando una copia exacta.
mongorestore --uri="$LOCAL_URI" --db="$DB_NAME" --drop "$DUMP_DIR/$DB_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Error: Falló al restaurar la base de datos local. Verifica que MongoDB local esté corriendo."
    rm -rf "$DUMP_DIR"
    exit 1
fi

echo "✔ Restauración completada."

# Limpiar archivos temporales
rm -rf "$DUMP_DIR"

echo "============================================================"
echo "🎉 ¡Copia completada con éxito!"
echo "Tu base de datos local ahora es una copia exacta de la de producción en Atlas."
echo "============================================================"
