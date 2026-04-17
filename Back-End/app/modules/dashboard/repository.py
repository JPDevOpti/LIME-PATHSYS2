from datetime import datetime, timezone

from pymongo.database import Database

from app.core.alma_mater_exclusion import nor_list_completed_not_alma_mater
from app.core.business_days import calculate_opportunity_days
from app.core.date_utils import COLOMBIA_TZ, colombia_calendar_month_range_utc


class DashboardRepository:
    def __init__(self, db: Database):
        self.cases = db["cases"]
        self.patients = db["patients"]
        self.entities = db["entities"]

    def get_metrics(self, pathologist_name: str = None) -> dict:
        now = datetime.now(COLOMBIA_TZ)

        # "mes actual" = mes calendario anterior completo (ej. enero si estamos en febrero)
        tm_year, tm_month = self._prev_month(now.year, now.month)
        tm_start_dt, tm_end_dt = self._calendar_month_range(tm_year, tm_month)

        # "mes anterior" = dos meses atrás (ej. diciembre si estamos en febrero)
        lm_year, lm_month = self._prev_month(tm_year, tm_month)
        lm_start_dt, lm_end_dt = self._calendar_month_range(lm_year, lm_month)

        base_query_tm = {
            "date_info.0.created_at": {"$gte": tm_start_dt, "$lt": tm_end_dt}
        }
        base_query_lm = {
            "date_info.0.created_at": {"$gte": lm_start_dt, "$lt": lm_end_dt}
        }

        if pathologist_name:
            base_query_tm["assigned_pathologist.name"] = pathologist_name
            base_query_lm["assigned_pathologist.name"] = pathologist_name

        casos_mes_actual = self.cases.count_documents(base_query_tm)
        casos_mes_anterior = self.cases.count_documents(base_query_lm)

        pacientes_mes_actual = len(
            self.cases.distinct("patient_info.patient_id", base_query_tm)
        )
        pacientes_mes_anterior = len(
            self.cases.distinct("patient_info.patient_id", base_query_lm)
        )

        def calc_change(actual, anterior):
            if anterior == 0:
                return 100.0 if actual > 0 else 0.0
            return round(((actual - anterior) / anterior) * 100, 1)

        return {
            "pacientes": {
                "mes_actual": pacientes_mes_actual,
                "mes_anterior": pacientes_mes_anterior,
                "cambio_porcentual": calc_change(
                    pacientes_mes_actual, pacientes_mes_anterior
                ),
            },
            "casos": {
                "mes_actual": casos_mes_actual,
                "mes_anterior": casos_mes_anterior,
                "cambio_porcentual": calc_change(casos_mes_actual, casos_mes_anterior),
            },
        }

    def get_monthly_cases_data(self, pathologist_name: str = None) -> dict:
        now = datetime.now(COLOMBIA_TZ)
        year = now.year
        datos = []

        for month in range(1, 13):
            month_start, month_end = self._calendar_month_range(year, month)
            query = {"date_info.0.created_at": {"$gte": month_start, "$lt": month_end}}
            if pathologist_name:
                query["assigned_pathologist.name"] = pathologist_name
            datos.append(self.cases.count_documents(query))

        return {"datos": datos, "total": sum(datos), "año": year}

    def get_urgent_cases(
        self, pathologist_name: str = None, limit: int = 50
    ) -> list[dict]:
        query = {
            "state": {"$ne": "Completado"},
        }
        if pathologist_name:
            query["assigned_pathologist.name"] = pathologist_name

        cursor = self.cases.find(query).sort("date_info.0.created_at", 1)

        results = []
        for doc in cursor:
            created_at_val = doc.get("date_info", [{}])[0].get("created_at")
            dias = 0
            created_at_str = ""
            if created_at_val:
                if isinstance(created_at_val, datetime):
                    created_dt = created_at_val
                    created_at_str = created_at_val.isoformat()
                    if not created_at_val.tzinfo and not created_at_str.endswith("Z") and "+00:00" not in created_at_str:
                        created_at_str += "Z"
                else:
                    created_at_str = str(created_at_val)
                    created_dt = datetime.fromisoformat(
                        created_at_str.replace("Z", "+00:00")
                    )
                dias = calculate_opportunity_days(
                    created_dt, datetime.now(timezone.utc)
                )

            patient_info = doc.get("patient_info", {})
            raw_entity = doc.get("entity")
            if isinstance(raw_entity, dict):
                entidad = raw_entity.get("name") or ""
            elif isinstance(raw_entity, str):
                entidad = raw_entity
            else:
                entity_info = patient_info.get("entity_info") or {}
                entidad = entity_info.get("entity_name") or ""
            opp_info = doc.get("opportunity_info") or [{}]
            max_opp_time = opp_info[0].get("max_opportunity_time") if opp_info else None
            opp_time = opp_info[0].get("opportunity_time") if opp_info else None
            was_timely = opp_info[0].get("was_timely") if opp_info else None

            try:
                max_opp_num = float(max_opp_time) if max_opp_time is not None else 6.0
            except (TypeError, ValueError):
                max_opp_num = 6.0

            try:
                opp_time_num = float(opp_time) if opp_time is not None else None
            except (TypeError, ValueError):
                opp_time_num = None

            state = doc.get("state", "")
            # Casos sin firma: se evalúan con días en sistema.
            # Casos por entregar: priorizar opportunity_time/was_timely cuando exista.
            if state == "Por entregar":
                is_urgent = (was_timely is False) or (
                    opp_time_num is not None and opp_time_num > max_opp_num
                )
            else:
                is_urgent = dias > max_opp_num

            if not is_urgent:
                continue

            results.append(
                {
                    "id": str(doc["_id"]),
                    "codigo": doc["case_code"],
                    "paciente": {
                        "nombre": patient_info.get("full_name", "Desconocido"),
                        "cedula": f"{patient_info.get('identification_type', '')}-{patient_info.get('identification_number', '')}" if patient_info.get("identification_type") else patient_info.get("identification_number", ""),
                        "entidad": entidad or None,
                    },
                    "pruebas": [
                        f"{t.get('test_code')} - {t.get('name')}" if t.get("test_code") else t.get("name")
                        for s in doc.get("samples", [])
                        for t in s.get("tests", [])
                        if t.get("name") or t.get("test_code")
                    ],
                    "patologo": (doc.get("assigned_pathologist") or {}).get("name") or "Sin asignar",
                    "fecha_creacion": created_at_str or "",
                    "estado": state,
                    "prioridad": doc.get("priority", "normal"),
                    "dias_en_sistema": dias,
                    "tiempo_oportunidad_max": max_opp_time,
                }
            )
            if len(results) >= limit:
                break
        return results

    def _calendar_month_range(self, year: int, month: int):
        """Mes civil en Colombia; límites como instantes UTC para Mongo (end exclusivo)."""
        return colombia_calendar_month_range_utc(year, month)

    def _prev_month(self, year: int, month: int):
        """Retorna (year, month) del mes anterior."""
        if month == 1:
            return year - 1, 12
        return year, month - 1

    def get_opportunity_stats(self, pathologist_name: str = None) -> dict:
        """
        Muestra siempre el mes calendario ANTERIOR completo.
        En febrero muestra enero; en enero muestra diciembre del año anterior.
        Filtra por date_info.0.created_at y state='Completado'.
        Excluye casos HAMA. Compara con el mes previo a ese.
        """
        meses = {
            1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
            5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
            9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
        }

        now = datetime.now(COLOMBIA_TZ)

        target_year, target_month = self._prev_month(now.year, now.month)
        t_start, t_end = self._calendar_month_range(target_year, target_month)

        prev_year, prev_month = self._prev_month(target_year, target_month)
        p_start, p_end = self._calendar_month_range(prev_year, prev_month)

        def _opp_query(start, end):
            nor = nor_list_completed_not_alma_mater(self.entities)

            query = {
                "state": "Completado",
                "date_info.0.created_at": {"$gte": start, "$lt": end},
                "$nor": nor,
            }
            if pathologist_name:
                query["assigned_pathologist.name"] = pathologist_name
            return query

        def _calc(start, end):
            q = _opp_query(start, end)
            total = self.cases.count_documents(q)
            within = self.cases.count_documents(
                {**q, "opportunity_info.0.was_timely": True}
            )
            out = self.cases.count_documents(
                {**q, "opportunity_info.0.was_timely": False}
            )
            pipeline = [
                {"$match": q},
                {
                    "$addFields": {
                        "_opp_time": {
                            "$arrayElemAt": ["$opportunity_info.opportunity_time", 0]
                        }
                    }
                },
                {"$match": {"_opp_time": {"$ne": None}}},
                {"$group": {"_id": None, "avg": {"$avg": "$_opp_time"}}},
            ]
            avg_res = list(self.cases.aggregate(pipeline))
            avg = round(avg_res[0]["avg"], 1) if avg_res else 0.0
            pct = round((within / total) * 100, 1) if total > 0 else 0.0
            sin_eval = max(0, total - within - out)
            return total, within, out, avg, pct, sin_eval

        t_total, t_within, t_out, t_avg, t_pct, t_sin_eval = _calc(t_start, t_end)
        p_total, _, _, _, p_pct, _ = _calc(p_start, p_end)

        change = round(t_pct - p_pct, 1)

        return {
            "porcentaje_oportunidad": t_pct,
            "cambio_porcentual": change,
            "tiempo_promedio": t_avg,
            "casos_dentro_oportunidad": t_within,
            "casos_fuera_oportunidad": t_out,
            "total_casos_periodo": t_total,
            "casos_sin_evaluacion_oportunidad": t_sin_eval,
            "total_casos_mes_anterior": p_total,
            "mes_anterior": {
                "nombre": meses.get(target_month, ""),
                "inicio": t_start.isoformat(),
                "fin": t_end.isoformat(),
            },
        }
