from datetime import datetime, timezone
from typing import Any

from pymongo.collection import Collection
from pymongo.database import Database


MESES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


def _month_range(year: int, month: int) -> tuple[datetime, datetime]:
    """Retorna (start_dt, end_dt) en UTC para el mes dado (extremo superior exclusivo)."""
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, end


class StatisticsRepository:
    def __init__(self, db: Database):
        self.cases: Collection = db["cases"]
        self.tests_col: Collection = db["tests"]

    def _hama_exclusion(self) -> dict[str, Any]:
        entity_name_pattern = "h[aá]ma|alma\\s*m[aá]ter|alma\\s*m[aá]ter\\s*de\\s*antioquia"
        entity_code_pattern = "^HAMA(?:[-_].*)?$"
        return {
            "$nor": [
                {"patient_info.entity_info.entity_code": {"$regex": entity_code_pattern, "$options": "i"}},
                {"patient_info.entity_info.code": {"$regex": entity_code_pattern, "$options": "i"}},
                {"patient_info.entity_code": {"$regex": entity_code_pattern, "$options": "i"}},
                {"entity_code": {"$regex": entity_code_pattern, "$options": "i"}},
                {"entity": {"$regex": entity_name_pattern, "$options": "i"}},
                {"patient_info.entity_info.entity_name": {"$regex": entity_name_pattern, "$options": "i"}},
                {"patient_info.entity_info.name": {"$regex": entity_name_pattern, "$options": "i"}},
                {"patient_info.entity_name": {"$regex": entity_name_pattern, "$options": "i"}},
                {"patient_info.entity": {"$regex": entity_name_pattern, "$options": "i"}},
                {"institution": {"$regex": entity_name_pattern, "$options": "i"}},
            ]
        }

    # ── helpers ────────────────────────────────────────────────────────────────

    def _base_match(
        self,
        year: int,
        month: int,
        entity_name: str | None = None,
        completed_only: bool = True,
        exclude_hama: bool = False,
    ) -> dict:
        """
        Filtra por date_info.0.created_at en el mes solicitado.
        Si completed_only=True, restringe a casos 'Completado' para métricas de oportunidad.
        Esto asegura que se cuenten los casos que EMPEZARON ese mes, sin importar cuándo se completaron,
        pero solo si ya están completados para tener el dato de was_timely.
        """
        start, end = _month_range(year, month)
        match: dict[str, Any] = {
            "date_info.0.created_at": {"$gte": start, "$lt": end},
        }
        if exclude_hama:
            match.update(self._hama_exclusion())
        if completed_only:
            match["state"] = "Completado"

        if entity_name:
            match["patient_info.entity_info.entity_name"] = entity_name
        return match

    def _test_name_map(self) -> dict[str, str]:
        """Devuelve {test_code: test_name} desde la colección tests."""
        result = {}
        for doc in self.tests_col.find({}, {"test_code": 1, "name": 1}):
            code = doc.get("test_code") or str(doc["_id"])
            result[code] = doc.get("name", code)
        return result

    # ── Oportunidad general ────────────────────────────────────────────────────

    def get_opportunity_report(
        self,
        year: int,
        month: int,
        entity_name: str | None = None,
    ) -> dict[str, Any]:
        # Solo casos COMPLETADOS que EMPEZARON en el mes solicitado
        match = self._base_match(
            year,
            month,
            entity_name,
            completed_only=True,
            exclude_hama=True,
        )
        test_names = self._test_name_map()

        # ── Resumen global ─────────────────────────────────────────────────────
        total = self.cases.count_documents(match)
        within = self.cases.count_documents({**match, "opportunity_info.0.was_timely": True})
        out = self.cases.count_documents({**match, "opportunity_info.0.was_timely": False})

        avg_pipeline = [
            {"$match": match},
            {"$addFields": {"_opp_time": {"$arrayElemAt": ["$opportunity_info.opportunity_time", 0]}}},
            {"$match": {"_opp_time": {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$_opp_time"}}},
        ]
        avg_res = list(self.cases.aggregate(avg_pipeline))
        avg_days = round(avg_res[0]["avg"], 1) if avg_res else 0.0

        patients = len(self.cases.distinct("patient_info.patient_id", match))

        # ── Comparativa con mes anterior (Dashboard pattern) ─────────────────
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        prev_match = self._base_match(
            prev_year,
            prev_month,
            entity_name,
            completed_only=True,
            exclude_hama=True,
        )
        
        total_prev = self.cases.count_documents(prev_match)
        within_prev = self.cases.count_documents({**prev_match, "opportunity_info.0.was_timely": True})
        
        pct_curr = (within / total) * 100 if total > 0 else 0.0
        pct_prev = (within_prev / total_prev) * 100 if total_prev > 0 else 0.0
        diff = round(pct_curr - pct_prev, 1)

        summary = {
            "total": total,
            "within": within,
            "out": out,
            "averageDays": avg_days,
            "patients": patients,
            "total_last_month": total_prev,
            "percentage_change": diff,
        }

        # ── % mensual: solo meses completados del año (hasta el mes solicitado) ─
        monthly_pct: list[float] = []
        for m in range(1, 13):
            m_match = self._base_match(
                year,
                m,
                entity_name,
                completed_only=True,
                exclude_hama=True,
            )
            m_total = self.cases.count_documents(m_match)
            m_within = self.cases.count_documents({**m_match, "opportunity_info.0.was_timely": True})
            pct = round((m_within / m_total) * 100, 1) if m_total > 0 else 0.0
            monthly_pct.append(pct)

        # ── Por prueba ─────────────────────────────────────────────────────────
        test_pipeline = [
            {"$match": match},
            {"$addFields": {
                "opp_was_timely": {"$arrayElemAt": ["$opportunity_info.was_timely", 0]},
                "opp_time": {"$arrayElemAt": ["$opportunity_info.opportunity_time", 0]},
                "opp_max_time": {"$arrayElemAt": ["$opportunity_info.max_opportunity_time", 0]},
            }},
            {"$unwind": "$samples"},
            {"$unwind": "$samples.tests"},
            {
                "$group": {
                    "_id": "$samples.tests.id",
                    "name": {"$first": "$samples.tests.name"},
                    "within": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", True]}, 1, 0]}
                    },
                    "out": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", False]}, 1, 0]}
                    },
                    "avg_time": {"$avg": "$opp_time"},
                    "opp_time_days": {"$first": "$opp_max_time"},
                }
            },
            {"$sort": {"within": -1}},
        ]
        tests_raw = list(self.cases.aggregate(test_pipeline))
        tests_out = []
        for t in tests_raw:
            code = t["_id"] or ""
            tests_out.append({
                "code": code,
                "name": t.get("name") or test_names.get(code, code),
                "withinOpportunity": t["within"],
                "outOfOpportunity": t["out"],
                "averageDays": round(t["avg_time"], 1) if t.get("avg_time") is not None else None,
                "opportunityTimeDays": t.get("opp_time_days"),
            })

        # ── Por patólogo ───────────────────────────────────────────────────────
        path_pipeline = [
            {"$match": match},
            {"$addFields": {
                "opp_was_timely": {"$arrayElemAt": ["$opportunity_info.was_timely", 0]},
                "opp_time": {"$arrayElemAt": ["$opportunity_info.opportunity_time", 0]},
            }},
            {
                "$group": {
                    "_id": "$assigned_pathologist.name",
                    "within": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", True]}, 1, 0]}
                    },
                    "out": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", False]}, 1, 0]}
                    },
                    "avg_time": {"$avg": "$opp_time"},
                }
            },
            {"$sort": {"within": -1}},
        ]
        path_raw = list(self.cases.aggregate(path_pipeline))
        pathologists_out = []
        for p in path_raw:
            name = p["_id"] or "Sin asignar"
            pathologists_out.append({
                "code": name,
                "name": name,
                "withinOpportunity": p["within"],
                "outOfOpportunity": p["out"],
                "avgTime": round(p["avg_time"], 1) if p.get("avg_time") is not None else 0.0,
            })

        return {
            "tests": tests_out,
            "pathologists": pathologists_out,
            "monthlyPct": monthly_pct,
            "summary": summary,
        }

    # ── Entidades ──────────────────────────────────────────────────────────────

    def get_entities_report(self, year: int, month: int) -> dict[str, Any]:
        match = self._base_match(year, month, completed_only=True, exclude_hama=True)

        pipeline = [
            {"$match": match},
            {"$addFields": {
                "opp_was_timely": {"$arrayElemAt": ["$opportunity_info.was_timely", 0]},
                "opp_time": {"$arrayElemAt": ["$opportunity_info.opportunity_time", 0]},
            }},
            {
                "$group": {
                    "_id": "$patient_info.entity_info.entity_name",
                    "ambulatorios": {
                        "$sum": {"$cond": [{"$eq": ["$patient_info.care_type", "Ambulatorio"]}, 1, 0]}
                    },
                    "hospitalizados": {
                        "$sum": {"$cond": [{"$eq": ["$patient_info.care_type", "Hospitalizado"]}, 1, 0]}
                    },
                    "total": {"$sum": 1},
                    "dentro": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", True]}, 1, 0]}
                    },
                    "fuera": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", False]}, 1, 0]}
                    },
                    "avg_time": {"$avg": "$opp_time"},
                }
            },
            {"$sort": {"total": -1}},
        ]

        raw = list(self.cases.aggregate(pipeline))
        entities = []
        for r in raw:
            nombre = r["_id"] or "Sin entidad"
            entities.append({
                "nombre": nombre,
                "codigo": nombre,
                "ambulatorios": r["ambulatorios"],
                "hospitalizados": r["hospitalizados"],
                "total": r["total"],
                "dentroOportunidad": r["dentro"],
                "fueraOportunidad": r["fuera"],
                "tiempoPromedio": round(r["avg_time"], 1) if r.get("avg_time") is not None else 0.0,
            })

        total_amb = sum(e["ambulatorios"] for e in entities)
        total_hosp = sum(e["hospitalizados"] for e in entities)
        total_all = sum(e["total"] for e in entities)
        avg_all = (
            round(sum(e["tiempoPromedio"] * e["total"] for e in entities) / total_all, 1)
            if total_all > 0
            else 0.0
        )

        return {
            "entities": entities,
            "summary": {
                "total": total_all,
                "ambulatorios": total_amb,
                "hospitalizados": total_hosp,
                "tiempoPromedio": avg_all,
            },
        }

    def get_entity_details(
        self, entity_name: str, year: int, month: int
    ) -> dict[str, Any]:
        # Detalles: todos los casos del mes (no solo completados) para pruebas/patólogos
        match = {
            **self._base_match(year, month, completed_only=False, exclude_hama=True),
            "patient_info.entity_info.entity_name": entity_name,
        }
        test_names = self._test_name_map()

        test_pipeline = [
            {"$match": match},
            {"$unwind": "$samples"},
            {"$unwind": "$samples.tests"},
            {
                "$group": {
                    "_id": "$samples.tests.id",
                    "name": {"$first": "$samples.tests.name"},
                    "total": {"$sum": 1},
                }
            },
            {"$sort": {"total": -1}},
            {"$limit": 10},
        ]
        tests_raw = list(self.cases.aggregate(test_pipeline))
        pruebas = []
        for t in tests_raw:
            code = t["_id"] or ""
            pruebas.append({
                "codigo": code,
                "nombre": t.get("name") or test_names.get(code, code),
                "total_solicitudes": t["total"],
            })

        path_pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": "$assigned_pathologist.name",
                    "total": {"$sum": 1},
                }
            },
            {"$sort": {"total": -1}},
        ]
        path_raw = list(self.cases.aggregate(path_pipeline))
        pathologists = []
        for p in path_raw:
            name = p["_id"] or "Sin asignar"
            pathologists.append({
                "name": name,
                "codigo": name,
                "casesCount": p["total"],
            })

        return {
            "pruebas_mas_solicitadas": pruebas,
            "pathologists": pathologists,
        }

    # ── Pruebas ────────────────────────────────────────────────────────────────

    def get_tests_report(
        self,
        year: int,
        month: int,
        entity_name: str | None = None,
    ) -> dict[str, Any]:
        # Pruebas: todos los casos del mes (completados o no) — volumen de solicitudes
        match = self._base_match(year, month, entity_name, completed_only=False, exclude_hama=True)
        test_names = self._test_name_map()

        pipeline = [
            {"$match": match},
            {"$unwind": "$samples"},
            {"$unwind": "$samples.tests"},
            {
                "$group": {
                    "_id": "$samples.tests.id",
                    "name": {"$first": "$samples.tests.name"},
                    "ambulatorios": {
                        "$sum": {"$cond": [{"$eq": ["$patient_info.care_type", "Ambulatorio"]}, 1, 0]}
                    },
                    "hospitalizados": {
                        "$sum": {"$cond": [{"$eq": ["$patient_info.care_type", "Hospitalizado"]}, 1, 0]}
                    },
                    "total": {"$sum": 1},
                }
            },
            {"$sort": {"total": -1}},
        ]

        raw = list(self.cases.aggregate(pipeline))
        tests = []
        for r in raw:
            code = r["_id"] or ""
            tests.append({
                "codigo": code,
                "nombre": r.get("name") or test_names.get(code, code),
                "ambulatorios": r["ambulatorios"],
                "hospitalizados": r["hospitalizados"],
                "total": r["total"],
            })

        total_amb = sum(t["ambulatorios"] for t in tests)
        total_hosp = sum(t["hospitalizados"] for t in tests)
        total_all = sum(t["total"] for t in tests)

        return {
            "tests": tests,
            "summary": {
                "total": total_all,
                "ambulatorios": total_amb,
                "hospitalizados": total_hosp,
            },
        }

    # ── Patólogos ──────────────────────────────────────────────────────────────

    def get_pathologists_report(self, year: int, month: int) -> list[dict[str, Any]]:
        match = self._base_match(year, month, completed_only=True, exclude_hama=True)

        pipeline = [
            {"$match": match},
            {"$addFields": {
                "opp_was_timely": {"$arrayElemAt": ["$opportunity_info.was_timely", 0]},
                "opp_time": {"$arrayElemAt": ["$opportunity_info.opportunity_time", 0]},
            }},
            {
                "$group": {
                    "_id": "$assigned_pathologist.name",
                    "within": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", True]}, 1, 0]}
                    },
                    "out": {
                        "$sum": {"$cond": [{"$eq": ["$opp_was_timely", False]}, 1, 0]}
                    },
                    "avg_time": {"$avg": "$opp_time"},
                }
            },
            {"$sort": {"within": -1}},
        ]

        raw = list(self.cases.aggregate(pipeline))
        result = []
        for r in raw:
            name = r["_id"] or "Sin asignar"
            result.append({
                "code": name,
                "name": name,
                "withinOpportunity": r["within"],
                "outOfOpportunity": r["out"],
                "avgTime": round(r["avg_time"], 1) if r.get("avg_time") is not None else 0.0,
            })
        return result

    def get_pathologist_entities(
        self, pathologist_name: str, year: int, month: int
    ) -> list[dict[str, Any]]:
        match = {
            **self._base_match(year, month, completed_only=True, exclude_hama=True),
            "assigned_pathologist.name": pathologist_name,
        }
        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": "$patient_info.entity_info.entity_name",
                    "total": {"$sum": 1},
                }
            },
            {"$sort": {"total": -1}},
        ]
        raw = list(self.cases.aggregate(pipeline))
        return [
            {
                "name": r["_id"] or "Sin entidad",
                "codigo": r["_id"] or "Sin entidad",
                "casesCount": r["total"],
            }
            for r in raw
        ]

    def get_available_entities(self) -> List[str]:
        """Devuelve los nombres únicos de entidades que tienen al menos un caso."""
        raw = self.cases.distinct("patient_info.entity_info.entity_name", self._hama_exclusion())
        return sorted([r for r in raw if r and isinstance(r, str)])

    def get_available_pathologists(self) -> List[str]:
        """Devuelve los nombres únicos de patólogos asignados que tienen al menos un caso."""
        raw = self.cases.distinct("assigned_pathologist.name", self._hama_exclusion())
        return sorted([r for r in raw if r and isinstance(r, str)])

    def get_pathologist_tests(
        self, pathologist_name: str, year: int, month: int
    ) -> list[dict[str, Any]]:
        match = {
            **self._base_match(year, month, completed_only=True, exclude_hama=True),
            "assigned_pathologist.name": pathologist_name,
        }
        test_names = self._test_name_map()
        pipeline = [
            {"$match": match},
            {"$unwind": "$samples"},
            {"$unwind": "$samples.tests"},
            {
                "$group": {
                    "_id": "$samples.tests.id",
                    "name": {"$first": "$samples.tests.name"},
                    "total": {"$sum": 1},
                }
            },
            {"$sort": {"total": -1}},
        ]
        raw = list(self.cases.aggregate(pipeline))
        result = []
        for r in raw:
            code = r["_id"] or ""
            result.append({
                "name": r.get("name") or test_names.get(code, code),
                "codigo": code,
                "count": r["total"],
            })
        return result
