#!/usr/bin/env python3
"""
Importa pruebas al sistema nuevo.

Puede leer desde:
  1. Archivo JSON (exportado por export_tests.py)
  2. Lista embebida (pruebas del sistema antiguo)

Variables de entorno:
    MONGODB_URI o MONGODB_URL: URI de MongoDB
    DATABASE_NAME: Nombre de la base (ej: pathsys)

Uso:
    python scripts/import_tests.py [--dry-run]
    python scripts/import_tests.py --file tests.json [--dry-run]
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.getenv("MONGODB_URL") and not os.getenv("MONGODB_URI"):
    os.environ["MONGODB_URI"] = os.environ["MONGODB_URL"]

from app.database import get_db
from app.modules.tests.repository import TestsRepository

# Pruebas del sistema antiguo (fallback si no hay archivo)
RAW_TESTS = [
    {"test_code": "898101", "name": "Estudio de Coloracion Basica en Biopsia", "desc": "Biopsia simple un (1) frasco con uno o varios fragmentos de tejido hasta 3 cm/cc."},
    {"test_code": "898201", "name": "Estudio de Coloracion Basica en Especimen de Reconocimiento", "desc": "Especimen quirurgico no tumoral."},
    {"test_code": "898241", "name": "Estudio de Coloracion Basica en Especimen con Reseccion de Margenes", "desc": "Especimen quirurgico por condicion tumoral."},
    {"test_code": "898102", "name": "Estudio Biopsia en Medula Osea", "desc": "Sin coloraciones especiales ni inmunohistoquimica"},
    {"test_code": "898807-1", "name": "Estudio Anatomopatologico de Marcacion Inmunohistoquimica", "desc": "Inmunohistoquimica basica (especifico) sin lectura."},
    {"test_code": "898807", "name": "Estudio Anatomopatologico de Marcacion Inmunohistoquimica", "desc": "Inmunohistoquimica basica (especifico): cada marcador en bloque de parafina."},
    {"test_code": "898812", "name": "Estudio Anatomopatologico de Marcacion Inmunohistoquimica Especial", "desc": "Inmunohistoquimica de alta complejidad."},
    {"test_code": "898813", "name": "Estudio Anatomopatologico de Marcacion Inmunohistoquimica Especial", "desc": "Inmunohistoquimica especiales: cada marcador tumoral en placa cargada."},
    {"test_code": "898018", "name": "Estudio Anatomopatologico por Inmunohistoquimica", "desc": "Estudio anatomopatologico por inmunohistoquimica en biopsia de medula osea"},
    {"test_code": "898808", "name": "Estudio Anatomopatologico en Biopsia por Tincion Histoquimica", "desc": "Coloraciones especiales: tricromico, reticulo, hierro, etc."},
    {"test_code": "898809", "name": "Estudio Anatomopatologico en Biopsia por Tincion Histoquimica", "desc": "Coloraciones especiales: tricromico, reticulo, hierro, etc."},
    {"test_code": "898017", "name": "Estudio Anatomopatologico en Citologia", "desc": "Estudio anatomopatologico en citologia por tincion de histoquimica."},
    {"test_code": "898003", "name": "Estudio de Coloracion Basica en Citologia por Aspiracion (BACAF)", "desc": "Ejemplo: tiroides, ganglio linfatico, mama, etc."},
    {"test_code": "898002", "name": "Estudio de Coloracion Basica en Citologia de Liquido Corporal", "desc": "Ejemplo: pleural, peritoneal, ascitico, LCR, orina, etc."},
    {"test_code": "898801", "name": "Estudio por Congelacion o Consulta Intra-operatoria", "desc": "Incluye cortes rapidos por congelacion e informe preliminar y final."},
    {"test_code": "898805", "name": "Verificacion Integral sin Preparacion de Material de Rutina", "desc": "Revision de placas por especialista en patologia"},
    {"test_code": "898304", "name": "Estudio Pos-mortem de Feto y Placenta", "desc": "Incluye diseccion del cadaver, estudio macroscopico y microscopico."},
    {"test_code": "898301", "name": "Autopsia Completa - Necropsia", "desc": "Incluye diseccion del cadaver, estudio macroscopico y microscopico."},
]

CODE_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


def load_tests_from_file(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("El archivo debe contener un array de pruebas")
    return data


def normalize_code(code: str) -> str:
    return str(code or "").strip().upper()


def normalize_time(value) -> int:
    v = int(value) if value is not None else 6
    if v <= 0:
        return 1
    if v <= 1440:
        return max(1, min(365, (v + 1439) // 1440))
    return min(365, v)


def import_tests(dry_run: bool, file_path: str | None) -> None:
    if file_path:
        raw = load_tests_from_file(file_path)
        print(f"Pruebas cargadas desde: {file_path}")
    else:
        raw = RAW_TESTS
        print("Usando lista embebida de pruebas")

    seen: set[str] = set()
    deduped: list[dict] = []
    for t in raw:
        code = normalize_code(t.get("test_code") or t.get("code", ""))
        name = (t.get("name") or "").strip()
        if not code or not name:
            continue
        if code in seen:
            continue
        if not CODE_PATTERN.match(code):
            continue
        seen.add(code)
        desc = (t.get("description") or t.get("desc") or "").strip() or None
        if desc and len(desc) > 1000:
            desc = desc[:1000]
        time_val = normalize_time(t.get("time", 6))
        price = float(t.get("price", 0) or 0)
        if price < 0:
            price = 0
        deduped.append({
            "test_code": code,
            "name": name,
            "description": desc,
            "time": time_val,
            "price": price,
            "is_active": t.get("is_active", True),
        })

    print("=" * 60)
    print("IMPORTACION DE PRUEBAS")
    print("=" * 60)
    print(f"Modo: {'DRY-RUN (sin cambios)' if dry_run else 'EJECUCION REAL'}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total a procesar: {len(deduped)}")
    print("=" * 60)

    if dry_run:
        for i, t in enumerate(deduped, 1):
            print(f"\n[{i}/{len(deduped)}] {t['test_code']} - {t['name']}")
        print("\n" + "=" * 60)
        print("DRY-RUN: no se realizaron cambios")
        print("=" * 60)
        return

    try:
        db = get_db()
        db.command("ping")
    except Exception as e:
        print(f"Error de conexion a MongoDB: {e}")
        sys.exit(1)

    repo = TestsRepository(db)
    repo._ensure_indexes()

    created = 0
    skipped = 0
    errors = 0

    for i, t in enumerate(deduped, 1):
        print(f"\n[{i}/{len(deduped)}] {t['test_code']} - {t['name']}")
        try:
            if repo.code_exists(t["test_code"]):
                print("  [OMITIR] Codigo ya existe")
                skipped += 1
                continue
            repo.create(t)
            print("  [OK] Prueba creada")
            created += 1
        except Exception as ex:
            print(f"  [ERROR] {ex}")
            errors += 1

    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Creadas: {created}")
    print(f"Omitidas: {skipped}")
    print(f"Errores: {errors}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Importar pruebas al sistema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python scripts/import_tests.py --dry-run
  python scripts/import_tests.py
  python scripts/import_tests.py --file tests.json --dry-run
  python scripts/import_tests.py --file tests.json
        """,
    )
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar que se haria")
    parser.add_argument("--file", "-f", help="Archivo JSON con pruebas (exportado por export_tests.py)")
    args = parser.parse_args()
    import_tests(dry_run=args.dry_run, file_path=args.file)


if __name__ == "__main__":
    main()
