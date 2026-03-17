#!/usr/bin/env python3
"""
Actualiza códigos y nombres de entidades en la base local (pathsys)
según una tabla de mapeo, y sincroniza los textos de entidades en
pacientes y casos.

Reglas:
  - Para cada fila de la tabla:
      · Si tiene codigo_sugerido:
          - Se busca la entidad por código actual (si existe) o por nombre.
          - Si se encuentra:
                · Se actualizan name y code al valor nuevo.
          - Si no se encuentra:
                · Se crea una nueva entidad activa con ese name y code.
          - En pacientes y casos se reemplaza el nombre viejo por el nuevo.
      · Si NO tiene codigo_sugerido:
          - La entidad conserva su code y name.
          - Se evalúa su uso:
                · Si no está referenciada en pacientes ni casos → is_active=False.
                · Si está en uso → se deja is_active como está.

  - Las referencias en otras colecciones son solo por nombre:
        · patients.entity_info.entity_name
        · cases.entity
        · cases.patient_info.entity_info.entity_name

Idempotencia:
  - Se puede ejecutar varias veces sin duplicar entidades ni romper códigos.

Uso:
    python3 update_entities_codes_and_names.py [--dry-run]

Parámetros opcionales:
    --dest-url  MongoDB URI destino (por defecto MONGODB_URI o mongodb://localhost:27017)
    --dest-db   Nombre de la base de datos (por defecto pathsys)
"""

import argparse
import os
from dataclasses import dataclass
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database


LOCAL_URL = (
    os.environ.get("DEST_ATLAS_URI")
    or os.environ.get("MONGODB_URI")
    or "mongodb://localhost:27017"
)
LOCAL_DB = "pathsys"


@dataclass(frozen=True)
class EntityMapping:
    current_name: str
    current_code: str | None
    new_code: str | None
    new_name: str


MAPPINGS: list[EntityMapping] = [
    EntityMapping(
        current_name="Hospital Universitario San Vicente de Paul",
        current_code="HSV001",
        new_code="001",
        new_name="Hospital Universitario San Vicente de Paul",
    ),
    EntityMapping(
        current_name="Centros Especializados HSVF Rionegro",
        current_code="HSVR",
        new_code="002",
        new_name="Centros Especializados HSVF Rionegro",
    ),
    EntityMapping(
        current_name="Hospital Alma Máter de Antioquia",
        current_code="HAMA",
        new_code="003",
        new_name="Hospital Alma Máter de Antioquia",
    ),
    EntityMapping(
        current_name="TEM - SIU",
        current_code="TEM",
        new_code="004",
        new_name="TEM - SIU",
    ),
    EntityMapping(
        current_name="Renales IPS Clínica León XIII",
        current_code="LEON XIII",
        new_code="005",
        new_name="Renales IPS Clínica León XIII",
    ),
    EntityMapping(
        current_name="Clínica Somer",
        current_code="SOMER",
        new_code="006",
        new_name="Clínica Somer",
    ),
    EntityMapping(
        current_name="Particular",
        current_code="PARTICULAR",
        new_code="007",
        new_name="Particular",
    ),
    EntityMapping(
        current_name="Clínica Cardiovascular",
        current_code="HSCV003",
        new_code="008",
        new_name="Clínica Cardiovascular",
    ),
    EntityMapping(
        current_name="INMUNOPAT",
        current_code="000001",
        new_code=None,
        new_name="INMUNOPAT",
    ),
    EntityMapping(
        current_name="Clínica Las Américas",
        current_code="800067065-9",
        new_code="013",
        new_name="Clínica Las Américas",
    ),
    EntityMapping(
        current_name="Clínica CES",
        current_code="CES",
        new_code="014",
        new_name="Clínica CES",
    ),
    EntityMapping(
        current_name="Hospital General de Medellín Luz Castro G.",
        current_code="HGM",
        new_code=None,
        new_name="Hospital General de Medellín Luz Castro G.",
    ),
    EntityMapping(
        current_name="Microbiología",
        current_code="MICRO",
        new_code=None,
        new_name="Microbiología",
    ),
    EntityMapping(
        current_name="Investigación",
        current_code="INV",
        new_code="011",
        new_name="Investigación",
    ),
    EntityMapping(
        current_name="Neurocentro - Pereira",
        current_code="NEUROC",
        new_code=None,
        new_name="Neurocentro - Pereira",
    ),
    EntityMapping(
        current_name="Patología Integral S.A",
        current_code="PINTEGRAL",
        new_code="015",
        new_name="Patología Integral S.A",
    ),
    EntityMapping(
        current_name="Patología Suescún S.A.S",
        current_code="DST",
        new_code="012",
        new_name="Patología Suescún S.A.S",
    ),
    EntityMapping(
        current_name="SURA",
        current_code="SURA",
        new_code="009",
        new_name="SURA",
    ),
    EntityMapping(
        current_name="PROLAB S.A.S",
        current_code="PROLAB",
        new_code=None,
        new_name="PROLAB S.A.S",
    ),
    EntityMapping(
        current_name="VID-Congregación Mariana",
        current_code="VID",
        new_code="016",
        new_name="VID-Congregación Mariana",
    ),
    EntityMapping(
        current_name="IPS Universitaria Ambulatoria",
        current_code="IPSA",
        new_code=None,
        new_name="IPS Universitaria Ambulatoria",
    ),
    EntityMapping(
        current_name="Hospital Pablo Tobón Uribe",
        current_code="HPTU",
        new_code="010",
        new_name="Hospital Pablo Tobón Uribe",
    ),
    EntityMapping(
        current_name="Synlab",
        current_code=None,
        new_code="017",
        new_name="Synlab",
    ),
    EntityMapping(
        current_name="Laboratorio Dr Rodrigo Restrepo",
        current_code=None,
        new_code="018",
        new_name="Laboratorio Dr Rodrigo Restrepo",
    ),
    EntityMapping(
        current_name="LAPACI",
        current_code=None,
        new_code="019",
        new_name="LAPACI",
    ),
]


def normalize_code(value: str | None) -> str | None:
    if not value:
        return None
    return value.strip().upper()


def normalize_name(value: str | None) -> str:
    return (value or "").strip()


def find_entity(entities_coll, mapping: EntityMapping) -> dict[str, Any] | None:
    """
    Busca la entidad por código actual (normalizado) o por nombre exacto (case-sensitive).
    """
    if mapping.current_code:
        code = normalize_code(mapping.current_code)
        doc = entities_coll.find_one({"code": code})
        if doc:
            return doc

    name = normalize_name(mapping.current_name)
    if not name:
        return None
    return entities_coll.find_one({"name": name})


def update_entity_and_references(
    db: Database,
    mapping: EntityMapping,
    dry_run: bool,
    stats: dict[str, int],
) -> None:
    entities_coll = db["entities"]
    patients_coll = db["patients"]
    cases_coll = db["cases"]

    current_name = normalize_name(mapping.current_name)
    new_name = normalize_name(mapping.new_name)
    new_code = normalize_code(mapping.new_code)

    # 1) Resolver entidad en colección entities
    existing = find_entity(entities_coll, mapping)

    if new_code:
        # Caso con nuevo código sugerido
        if existing:
            # Si el new_code ya existe en otra entidad, evitamos chocar el índice único.
            # En ese caso actualizamos la entidad "canónica" (la que ya tiene new_code),
            # sincronizamos referencias por nombre, y luego intentamos inactivar la vieja
            # si queda sin uso.
            conflict = entities_coll.find_one({"code": new_code})
            if conflict and conflict.get("_id") != existing.get("_id"):
                if dry_run:
                    print(
                        f"[DRY-RUN] entities: conflicto de code {new_code!r}. "
                        f"Se mantiene {_id_str(conflict)} como canónica y se evita "
                        f"actualizar {_id_str(existing)} para no duplicar."
                    )
                else:
                    if conflict.get("name") != new_name:
                        entities_coll.update_one(
                            {"_id": conflict["_id"]}, {"$set": {"name": new_name}}
                        )
                        stats["entities_updated"] += 1

                # 2) Actualizar referencias por nombre en pacientes y casos
                if current_name and new_name and current_name != new_name:
                    # patients.entity_info.entity_name
                    q_patients = {"entity_info.entity_name": current_name}
                    update_patients = {"$set": {"entity_info.entity_name": new_name}}
                    if dry_run:
                        count_p = patients_coll.count_documents(q_patients)
                        if count_p:
                            print(
                                f"[DRY-RUN] patients: {count_p} docs "
                                f"{current_name!r}→{new_name!r}"
                            )
                    else:
                        res_p = patients_coll.update_many(q_patients, update_patients)
                        if res_p.modified_count:
                            print(
                                f"[OK] patients: {res_p.modified_count} docs "
                                f"{current_name!r}→{new_name!r}"
                            )

                    # cases.entity
                    q_cases_entity = {"entity": current_name}
                    update_cases_entity = {"$set": {"entity": new_name}}
                    if dry_run:
                        count_ce = cases_coll.count_documents(q_cases_entity)
                        if count_ce:
                            print(
                                f"[DRY-RUN] cases.entity: {count_ce} docs "
                                f"{current_name!r}→{new_name!r}"
                            )
                    else:
                        res_ce = cases_coll.update_many(q_cases_entity, update_cases_entity)
                        if res_ce.modified_count:
                            print(
                                f"[OK] cases.entity: {res_ce.modified_count} docs "
                                f"{current_name!r}→{new_name!r}"
                            )

                    # cases.patient_info.entity_info.entity_name
                    q_cases_pi = {"patient_info.entity_info.entity_name": current_name}
                    update_cases_pi = {
                        "$set": {"patient_info.entity_info.entity_name": new_name}
                    }
                    if dry_run:
                        count_pi = cases_coll.count_documents(q_cases_pi)
                        if count_pi:
                            print(
                                f"[DRY-RUN] cases.patient_info.entity_info.entity_name: "
                                f"{count_pi} docs {current_name!r}→{new_name!r}"
                            )
                    else:
                        res_pi = cases_coll.update_many(q_cases_pi, update_cases_pi)
                        if res_pi.modified_count:
                            print(
                                "[OK] cases.patient_info.entity_info.entity_name: "
                                f"{res_pi.modified_count} docs {current_name!r}→{new_name!r}"
                            )

                # 3) Inactivar entidad vieja si quedó sin referencias
                old_name = normalize_name(existing.get("name"))
                if old_name:
                    used_in_patients = patients_coll.count_documents(
                        {"entity_info.entity_name": old_name}
                    )
                    used_in_cases_entity = cases_coll.count_documents({"entity": old_name})
                    used_in_cases_pi = cases_coll.count_documents(
                        {"patient_info.entity_info.entity_name": old_name}
                    )
                    if used_in_patients + used_in_cases_entity + used_in_cases_pi == 0:
                        if existing.get("is_active", True):
                            if dry_run:
                                print(
                                    "[DRY-RUN] entities: inactivar (post-merge) "
                                    f"{_id_str(existing)} name={old_name!r}"
                                )
                                stats["entities_inactivated"] += 1
                            else:
                                entities_coll.update_one(
                                    {"_id": existing["_id"]},
                                    {"$set": {"is_active": False}},
                                )
                                print(
                                    f"[OK] entities: inactivada (post-merge) {_id_str(existing)} "
                                    f"name={old_name!r}"
                                )
                                stats["entities_inactivated"] += 1
                return

            # Actualizar código y nombre
            query = {"_id": existing["_id"]}
            update: dict[str, Any] = {"name": new_name, "code": new_code}
            if dry_run:
                print(
                    f"[DRY-RUN] entities: actualizar {_id_str(existing)} "
                    f"code={existing.get('code')}→{new_code} "
                    f"name={existing.get('name')!r}→{new_name!r}"
                )
                stats["entities_updated"] += 1
            else:
                entities_coll.update_one(query, {"$set": update})
                stats["entities_updated"] += 1
        else:
            # Crear nueva entidad
            doc = {
                "name": new_name,
                "code": new_code,
                "observations": None,
                "is_active": True,
            }
            if dry_run:
                print(
                    f"[DRY-RUN] entities: crear nueva entidad "
                    f"code={new_code} name={new_name!r}"
                )
                stats["entities_created"] += 1
            else:
                entities_coll.insert_one(doc)
                stats["entities_created"] += 1

        # 2) Actualizar referencias por nombre en pacientes y casos
        if current_name and new_name and current_name != new_name:
            # patients.entity_info.entity_name
            q_patients = {"entity_info.entity_name": current_name}
            update_patients = {"$set": {"entity_info.entity_name": new_name}}
            if dry_run:
                count_p = patients_coll.count_documents(q_patients)
                if count_p:
                    print(
                        f"[DRY-RUN] patients: {count_p} docs "
                        f"{current_name!r}→{new_name!r}"
                    )
            else:
                res_p = patients_coll.update_many(q_patients, update_patients)
                if res_p.modified_count:
                    print(
                        f"[OK] patients: {res_p.modified_count} docs "
                        f"{current_name!r}→{new_name!r}"
                    )

            # cases.entity
            q_cases_entity = {"entity": current_name}
            update_cases_entity = {"$set": {"entity": new_name}}
            if dry_run:
                count_ce = cases_coll.count_documents(q_cases_entity)
                if count_ce:
                    print(
                        f"[DRY-RUN] cases.entity: {count_ce} docs "
                        f"{current_name!r}→{new_name!r}"
                    )
            else:
                res_ce = cases_coll.update_many(q_cases_entity, update_cases_entity)
                if res_ce.modified_count:
                    print(
                        f"[OK] cases.entity: {res_ce.modified_count} docs "
                        f"{current_name!r}→{new_name!r}"
                    )

            # cases.patient_info.entity_info.entity_name
            q_cases_pi = {"patient_info.entity_info.entity_name": current_name}
            update_cases_pi = {
                "$set": {"patient_info.entity_info.entity_name": new_name}
            }
            if dry_run:
                count_pi = cases_coll.count_documents(q_cases_pi)
                if count_pi:
                    print(
                        f"[DRY-RUN] cases.patient_info.entity_info.entity_name: "
                        f"{count_pi} docs {current_name!r}→{new_name!r}"
                    )
            else:
                res_pi = cases_coll.update_many(q_cases_pi, update_cases_pi)
                if res_pi.modified_count:
                    print(
                        "[OK] cases.patient_info.entity_info.entity_name: "
                        f"{res_pi.modified_count} docs {current_name!r}→{new_name!r}"
                    )
    else:
        # Sin nuevo código sugerido:
        #   - mantener code y name
        #   - inactivar si no tiene referencias en pacientes ni casos
        if not existing:
            # Nada que hacer si la entidad no existe
            return

        entity_name = normalize_name(existing.get("name"))
        if not entity_name:
            return

        # Contar referencias
        used_in_patients = patients_coll.count_documents(
            {"entity_info.entity_name": entity_name}
        )
        used_in_cases_entity = cases_coll.count_documents({"entity": entity_name})
        used_in_cases_pi = cases_coll.count_documents(
            {"patient_info.entity_info.entity_name": entity_name}
        )
        total_used = used_in_patients + used_in_cases_entity + used_in_cases_pi

        if total_used == 0:
            # Solo inactivamos si no tiene uso
            if existing.get("is_active", True):
                if dry_run:
                    print(
                        "[DRY-RUN] entities: inactivar "
                        f"{_id_str(existing)} name={entity_name!r}"
                    )
                    stats["entities_inactivated"] += 1
                else:
                    entities_coll.update_one(
                        {"_id": existing["_id"]}, {"$set": {"is_active": False}}
                    )
                    print(
                        f"[OK] entities: inactivada {_id_str(existing)} "
                        f"name={entity_name!r}"
                    )
                    stats["entities_inactivated"] += 1


def _id_str(doc: dict[str, Any]) -> str:
    return str(doc.get("_id", ""))


def run(dry_run: bool, dest_url: str = LOCAL_URL, dest_db: str = LOCAL_DB) -> None:
    print("=" * 70)
    print("  ACTUALIZACIÓN DE ENTIDADES (códigos, nombres y referencias)")
    print("=" * 70)
    print(f"  Modo : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}")
    print(f"  DB   : {dest_db}")
    print()

    print("Conectando a MongoDB destino...")
    client = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("  Destino OK\n")

    db = client[dest_db]

    stats = {
        "entities_updated": 0,
        "entities_created": 0,
        "entities_inactivated": 0,
    }

    for mapping in MAPPINGS:
        update_entity_and_references(db, mapping, dry_run, stats)

    client.close()

    print("\n" + "-" * 70)
    print("RESUMEN")
    print("-" * 70)
    print(f"  Entidades actualizadas : {stats['entities_updated']}")
    print(f"  Entidades creadas      : {stats['entities_created']}")
    print(f"  Entidades inactivadas  : {stats['entities_inactivated']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Actualiza códigos y nombres de entidades, y sus referencias."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular cambios sin escribir en la base de datos",
    )
    parser.add_argument(
        "--dest-url",
        default=LOCAL_URL,
        help="MongoDB URI destino",
    )
    parser.add_argument(
        "--dest-db",
        default=LOCAL_DB,
        help="Base de datos destino (default: pathsys)",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, dest_url=args.dest_url, dest_db=args.dest_db)

