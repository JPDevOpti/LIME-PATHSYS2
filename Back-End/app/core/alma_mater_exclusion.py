"""
Exclusión solo del catálogo Hospital Alma Máter / HAMA (003), no de la línea Renales*.

Solo `entity` en raíz del caso (no `patient_info.entity_info`).

Regla: se excluye un caso si parece Alma Máter de catálogo (id 003 o nombre HAMA/Alma Máter)
**y** el nombre de entidad del caso no indica línea Renales (`renales` en `entity.name`).

Así «Renales Hospital Alma Mater» nunca se excluye, aunque comparta id o texto con el catálogo.
"""

from __future__ import annotations

from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.collection import Collection

ALMA_MATER_ENTITY_OBJECT_ID_HEX = "69ba9b092a505918c24495f2"


def alma_mater_entity_id_exclusion_values(entities_coll: Collection | None) -> list[Any]:
    """Ids de entidad catálogo 003 / Alma Máter (ObjectId y string; casos heterogéneos)."""
    values: list[Any] = []
    seen_hex: set[str] = set()

    def add_oid_like(raw: Any) -> None:
        if raw is None:
            return
        if isinstance(raw, ObjectId):
            h = str(raw)
            if h in seen_hex:
                return
            seen_hex.add(h)
            values.append(raw)
            values.append(h)
            return
        s = str(raw).strip()
        if len(s) != 24:
            return
        try:
            oid = ObjectId(s)
        except InvalidId:
            return
        h = str(oid)
        if h in seen_hex:
            return
        seen_hex.add(h)
        values.append(oid)
        values.append(h)

    add_oid_like(ALMA_MATER_ENTITY_OBJECT_ID_HEX)
    if entities_coll is not None:
        try:
            doc = entities_coll.find_one({"code": {"$regex": "^003$", "$options": "i"}})
            if doc and doc.get("_id") is not None:
                add_oid_like(doc["_id"])
        except Exception:
            pass
    return values


def match_active_entities_visible_in_filters() -> dict[str, Any]:
    """
    Fragmento de query sobre `entities`: activas, sin catálogo 003/HAMA por código
    ni por nombre de catálogo Alma Máter si el nombre no es línea Renales*.
    """
    entity_code_pattern = "^HAMA(?:[-_].*)?$"
    entity_name_pattern = r"h[aá]ma|alma\s*m[aá]ter|alma\s*m[aá]ter\s*de\s*antioquia"
    return {
        "is_active": True,
        "$nor": [
            {"code": {"$regex": entity_code_pattern, "$options": "i"}},
            {"code": {"$regex": "^003$", "$options": "i"}},
            {
                "$and": [
                    {"name": {"$regex": entity_name_pattern, "$options": "i"}},
                    {"name": {"$not": {"$regex": "renales", "$options": "i"}}},
                ]
            },
        ],
    }


def nor_list_completed_not_alma_mater(entities_coll: Collection | None) -> list[dict[str, Any]]:
    """
    Un solo criterio compuesto en $nor: excluir solo si es catálogo Alma/HAMA y no es línea Renales.

    Antes: dos cláusulas OR en $nor (id 003 **o** nombre); Renales con mismo id que 003 quedaba fuera.
    """
    id_vals = alma_mater_entity_id_exclusion_values(entities_coll)
    name_is_alma_catalog = {
        "$regexMatch": {
            "input": {"$ifNull": ["$entity.name", ""]},
            "regex": r"alma\s*m[aá]ter(\s+de\s+antioquia)?|\bhama\b",
            "options": "i",
        }
    }
    name_is_renales_line = {
        "$regexMatch": {
            "input": {"$ifNull": ["$entity.name", ""]},
            "regex": "renales",
            "options": "i",
        }
    }
    or_alma_signals: list[dict[str, Any]] = [{"$expr": name_is_alma_catalog}]
    if id_vals:
        or_alma_signals.insert(0, {"entity.id": {"$in": id_vals}})
    return [
        {
            "$and": [
                {"$or": or_alma_signals},
                {"$expr": {"$not": name_is_renales_line}},
            ]
        }
    ]
