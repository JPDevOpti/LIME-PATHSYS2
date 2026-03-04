"""Repositorio de enfermedades (CIE-10, CIE-O)."""

from datetime import datetime, timezone
import re
from typing import Any

from pymongo.database import Database


class DiseasesRepository:
    def __init__(self, db: Database) -> None:
        self.db = db
        self.collection = db.get_collection("diseases")

    def _search_from_cases(
        self,
        query: str,
        table: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        normalized = (table or "").strip().upper()
        if normalized not in {"CIE10", "CIEO"}:
            return []

        diagnosis_path = "result.cie10_diagnosis" if normalized == "CIE10" else "result.cieo_diagnosis"
        regex = re.escape(query.strip())
        cursor = self.db.get_collection("cases").aggregate(
            [
                {
                    "$match": {
                        "$or": [
                            {f"{diagnosis_path}.code": {"$regex": regex, "$options": "i"}},
                            {f"{diagnosis_path}.name": {"$regex": regex, "$options": "i"}},
                        ]
                    }
                },
                {
                    "$project": {
                        "code": f"${diagnosis_path}.code",
                        "name": f"${diagnosis_path}.name",
                    }
                },
                {
                    "$match": {
                        "code": {"$type": "string", "$ne": ""},
                        "name": {"$type": "string", "$ne": ""},
                    }
                },
                {
                    "$group": {
                        "_id": {"code": "$code", "name": "$name"},
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "code": "$_id.code",
                        "name": "$_id.name",
                    }
                },
                {"$sort": {"code": 1}},
                {"$limit": limit},
            ]
        )
        return [
            {
                "id": f"fallback:{normalized}:{d['code']}",
                "table": normalized,
                "code": d["code"],
                "name": d["name"],
                "description": d["name"],
                "is_active": True,
            }
            for d in cursor
        ]

    def _normalize_table(self, table: str | None, default_table: str = "") -> str:
        normalized = str(table or "").strip().upper().replace("-", "").replace(" ", "")
        if normalized == "CIEO":
            return "CIEO"
        if normalized == "CIE10":
            return "CIE10"
        fallback = str(default_table or "").strip().upper().replace("-", "").replace(" ", "")
        if fallback in {"CIE10", "CIEO"}:
            return fallback
        return "CIE10"

    def _doc_to_dict(self, doc: dict[str, Any], default_table: str = "") -> dict[str, Any]:
        normalized_table = self._normalize_table(doc.get("table"), default_table=default_table)
        return {
            "id": str(doc.get("_id", "")),
            "table": normalized_table,
            "code": doc.get("code", "") or doc.get("codigo", ""),
            "name": doc.get("name", "") or doc.get("nombre", "") or doc.get("description", ""),
            "description": doc.get("description") or doc.get("name") or doc.get("nombre"),
            "is_active": doc.get("is_active", True),
        }

    def _table_filter(self, table: str | None) -> dict[str, Any]:
        normalized = (table or "").strip().upper().replace("-", "").replace(" ", "")
        if normalized == "CIE10":
            return {"$regex": r"^\s*CIE\s*-?\s*10\s*$", "$options": "i"}
        if normalized == "CIEO":
            return {"$regex": r"^\s*CIE\s*-?\s*O\s*$", "$options": "i"}
        return table.strip() if table and table.strip() else {"$exists": True}

    def _search_in_collections(
        self,
        query_filter: dict[str, Any],
        table: str | None,
        skip: int,
        limit: int,
    ) -> list[dict[str, Any]]:
        candidates = self._cie_collection_candidates(table)

        sanitized_query = {k: v for k, v in query_filter.items() if k != "table"}
        seen: set[tuple[str, str, str]] = set()
        output: list[dict[str, Any]] = []

        for collection_name, default_table in candidates:
            try:
                cursor = self.db.get_collection(collection_name).find(sanitized_query).skip(skip).limit(limit)
            except Exception:
                continue

            for doc in cursor:
                mapped = self._doc_to_dict(doc, default_table=default_table)
                key = (mapped["table"], mapped["code"], mapped["name"])
                if key in seen:
                    continue
                seen.add(key)
                output.append(mapped)
                if len(output) >= limit:
                    return output

        return output

    def search(
        self,
        query: str,
        table: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        regex = re.escape(query)
        q: dict[str, Any] = {
            "$or": [
                {"name": {"$regex": regex, "$options": "i"}},
                {"code": {"$regex": regex, "$options": "i"}},
                {"description": {"$regex": regex, "$options": "i"}},
                {"nombre": {"$regex": regex, "$options": "i"}},
                {"codigo": {"$regex": regex, "$options": "i"}},
            ],
            "is_active": {"$ne": False},
        }
        if table and table.strip():
            q["table"] = self._table_filter(table)
        cursor = self.collection.find(q).skip(skip).limit(limit)
        diseases = [self._doc_to_dict(d) for d in cursor]
        if diseases:
            return diseases
        from_alt_collections = self._search_in_collections(
            query_filter=q,
            table=table,
            skip=skip,
            limit=limit,
        )
        if from_alt_collections:
            return from_alt_collections
        return self._search_from_cases(query=query, table=table, limit=limit)

    def get_by_code(self, code: str) -> dict[str, Any] | None:
        doc = self.collection.find_one({"code": code, "is_active": {"$ne": False}})
        if not doc:
            return None
        return self._doc_to_dict(doc)

    def get_by_table(
        self,
        table: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        cursor = self.collection.find(
            {"table": table, "is_active": {"$ne": False}}
        ).skip(skip).limit(limit)
        return [self._doc_to_dict(d) for d in cursor]

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        data["is_active"] = data.get("is_active", True)
        data["created_at"] = now
        data["updated_at"] = now
        result = self.collection.insert_one(data)
        data["_id"] = result.inserted_id
        return self._doc_to_dict(data)

    def count_diseases(self) -> dict[str, int]:
        diseases_count = self.collection.count_documents({"is_active": {"$ne": False}})
        cie10_count = 0
        cieo_count = 0
        seen_collections: set[str] = set()
        for collection_name, normalized_table in self._cie_collection_candidates():
            if collection_name in seen_collections:
                continue
            seen_collections.add(collection_name)
            count = self.db.get_collection(collection_name).count_documents({"is_active": {"$ne": False}})
            if normalized_table == "CIE10":
                cie10_count += count
            else:
                cieo_count += count
        return {
            "diseases_collection": diseases_count,
            "cie10_collection": cie10_count,
            "cieo_collection": cieo_count,
            "total": diseases_count + cie10_count + cieo_count,
        }
