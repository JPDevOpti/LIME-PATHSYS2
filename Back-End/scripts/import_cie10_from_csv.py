#!/usr/bin/env python3
"""
Importa CIE-10 desde CSV a la coleccion diseases.

Variables de entorno: MONGODB_URI, DATABASE_NAME (o MONGODB_URL para compatibilidad)

Uso:
    python scripts/import_cie10_from_csv.py [ruta_csv]
    Si no se pasa ruta, busca scripts/cie-10.csv; si no existe intenta descargarlo.
"""

import csv
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.getenv("MONGODB_URL") and not os.getenv("MONGODB_URI"):
    os.environ["MONGODB_URI"] = os.getenv("MONGODB_URL")

from app.database import get_db

# Fuentes publicas del CSV CIE-10 (code,description)
CSV_SOURCES = [
    "https://raw.githubusercontent.com/nickhould/CIE-10/master/data/cie10.csv",
    "https://raw.githubusercontent.com/codificar/tabela_cid/main/cid10.csv",
]


def normalize_text(text: str | None) -> str | None:
    if text is None or (isinstance(text, str) and not text.strip()):
        return None
    return " ".join(str(text).split()).strip()


def try_download(dest: Path) -> bool:
    for url in CSV_SOURCES:
        try:
            print(f"  Descargando CIE-10 desde {url} ...")
            urllib.request.urlretrieve(url, dest)
            # Validar que tenga las columnas esperadas
            with open(dest, encoding="utf-8") as f:
                headers = [h.strip().lower() for h in f.readline().split(",")]
            if "code" in headers and "description" in headers:
                print(f"  Descarga exitosa -> {dest}")
                return True
            dest.unlink(missing_ok=True)
        except Exception as e:
            print(f"  Fallo {url}: {e}")
    return False


def is_individual_code(code: str) -> bool:
    """Filtra rangos como A00-B99 o L00-L14; acepta solo codigos individuales."""
    return bool(code) and '-' not in code


def process_csv(file_path: Path) -> list[dict]:
    diseases = []
    with open(file_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = normalize_text(row.get("code"))
            name = normalize_text(row.get("description"))
            if not code or not name or not is_individual_code(code):
                continue
            diseases.append({
                "table": "CIE10",
                "code": code,
                "name": name,
                "description": name,
                "is_active": True,
            })
    return diseases


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    backend_root = script_dir.parent
    default_paths = [
        script_dir / "cie-10.csv",
        backend_root.parent / "sistema-antiguo" / "Back-End" / "Scripts" / "cie-10.csv",
    ]

    file_path = sys.argv[1] if len(sys.argv) > 1 else None
    if file_path:
        path = Path(file_path)
    else:
        path = next((p for p in default_paths if p.exists()), None)

    if not path or not path.exists():
        print("CSV cie-10.csv no encontrado. Intentando descarga automatica...")
        dest = script_dir / "cie-10.csv"
        if not try_download(dest):
            print(
                "ADVERTENCIA: No se pudo obtener cie-10.csv. "
                "Coloca el archivo en Back-End/scripts/cie-10.csv y vuelve a ejecutar."
            )
            sys.exit(0)  # No fatal: el resto del setup continua
        path = dest

    diseases = process_csv(path)
    if not diseases:
        print("ADVERTENCIA: El CSV no contiene registros validos. Se omite la importacion.")
        sys.exit(0)

    total = len(diseases)
    print("=" * 60)
    print("IMPORTACION CIE-10")
    print("=" * 60)
    print(f"Fecha        : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Fuente       : {path}")
    print(f"Total CSV    : {total}")
    print("=" * 60)

    try:
        db = get_db()
        db.command("ping")
    except Exception as e:
        print(f"Error de conexion a MongoDB: {e}")
        sys.exit(1)

    coll = db.get_collection("diseases")

    # Cargar codigos existentes en memoria para evitar N+1 queries
    existing = {
        doc["code"]
        for doc in coll.find({"table": "CIE10"}, {"code": 1, "_id": 0})
    }
    print(f"Ya en BD     : {len(existing)}")
    print("=" * 60)

    now = datetime.now(timezone.utc).isoformat()
    to_insert = []
    skipped = 0

    for i, d in enumerate(diseases, 1):
        if d["code"] in existing:
            print(f"[{i:>5}/{total}] {d['code']:<8} - {d['name'][:60]}  [OMITIR]")
            skipped += 1
        else:
            d["created_at"] = now
            d["updated_at"] = now
            to_insert.append(d)
            print(f"[{i:>5}/{total}] {d['code']:<8} - {d['name'][:60]}  [OK]")

    created = 0
    if to_insert:
        # Insertar en lotes de 500 para mayor velocidad
        batch = 500
        for start in range(0, len(to_insert), batch):
            coll.insert_many(to_insert[start:start + batch], ordered=False)
            created += len(to_insert[start:start + batch])

    print("=" * 60)
    print(f"Completado. Creadas: {created}, Saltadas: {skipped}")
    print("=" * 60)


if __name__ == "__main__":
    main()
