from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pymongo.collection import Collection
from pymongo.database import Database

def _month_range(year: int, month: int):
    """Retorna (start_dt, end_dt) en UTC para el mes dado (extremo superior exclusivo)."""
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, end

class BillingRepository:
    def __init__(self, db: Database):
        self.db = db
        self.cases: Collection = db["cases"]
        self.users: Collection = db["users"]

    def get_pathologists_billing_report(self, year: int, month: int) -> Dict[str, Any]:
        start, end = _month_range(year, month)
        
        # Filtramos por casos que tengan signed_at en el rango solicitado.
        match = {
            "date_info.0.signed_at": {"$gte": start, "$lt": end},
        }

        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": "$assigned_pathologist.name",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]

        raw = list(self.cases.aggregate(pipeline))
        
        PRICE_PER_CASE = 25000.0
        
        pathologists = []
        grand_total = 0.0
        
        for r in raw:
            name = r["_id"] or "Sin asignar"
            count = r["count"]
            monto = count * PRICE_PER_CASE
            pathologists.append({
                "codigo": name,
                "nombre": name,
                "casos": count,
                "monto": monto
            })
            grand_total += monto
            
        return {
            "pathologists": pathologists,
            "total": grand_total
        }

    def get_tests_billing_report(self, year: int, month: int) -> Dict[str, Any]:
        start, end = _month_range(year, month)
        
        # 1. Obtener todas las pruebas para tener precios base y convenios
        all_tests = list(self.db["tests"].find({}))
        tests_map = {} # test_code -> {price, agreements: {entity_name -> price}}
        tests_names = {} # test_code -> name
        
        for t in all_tests:
            code = t.get("test_code")
            if not code: continue
            
            aggs = {}
            for agg in t.get("agreements", []):
                ent_name = agg.get("entity_name")
                if ent_name:
                    aggs[ent_name] = agg.get("price", 0)
            
            tests_map[code] = {
                "base_price": t.get("price", 0),
                "agreements": aggs
            }
            tests_names[code] = t.get("name", code)

        # 2. Pipeline para contar pruebas por caso y entidad
        # IMPORTANTE: En el esquema de casos, el campo es samples.tests.id, no code.
        pipeline = [
            {
                "$match": {
                    "date_info.0.created_at": {"$gte": start, "$lt": end}
                }
            },
            {"$unwind": "$samples"},
            {"$unwind": "$samples.tests"},
            {
                "$group": {
                    "_id": {
                        "test_code": "$samples.tests.id",
                        "entity": "$patient_info.entity_info.entity_name"
                    },
                    "count": {"$sum": "$samples.tests.quantity"},
                }
            }
        ]

        raw_data = list(self.cases.aggregate(pipeline))
        
        # 3. Procesar resultados
        tests_billing = {} # test_code -> {nombre, cantidad, monto}
        grand_total = 0.0
        
        for item in raw_data:
            # Añadimos comprobación ultra-defensiva
            if not isinstance(item, dict) or "_id" not in item:
                print(f"ALERTA: Item inesperado en agregación de facturación: {item}")
                continue
                
            _id_obj = item["_id"]
            if not isinstance(_id_obj, dict):
                print(f"ALERTA: _id no es un objeto: {item}")
                continue
                
            test_code = _id_obj.get("test_code")
            if not test_code: 
                # Si no hay test_code, tal vez sea un caso viejo o inconsistente
                continue
            
            entity_name = _id_obj.get("entity") or "Sin entidad"
            count = item.get("count", 0)
            
            t_info = tests_map.get(test_code)
            if not t_info:
                price = 0
            else:
                price = t_info["agreements"].get(entity_name, t_info["base_price"])
            
            monto = count * price
            
            if test_code not in tests_billing:
                tests_billing[test_code] = {
                    "codigo": test_code,
                    "nombre": tests_names.get(test_code, test_code),
                    "cantidad": 0,
                    "monto": 0.0
                }
            
            tests_billing[test_code]["cantidad"] += count
            tests_billing[test_code]["monto"] += monto
            grand_total += monto

        return {
            "tests": sorted(list(tests_billing.values()), key=lambda x: x["monto"], reverse=True),
            "total": grand_total
        }

    def get_test_billing_detail(self, year: int, month: int, test_code: str) -> Dict[str, Any]:
        start, end = _month_range(year, month)
        
        test_doc = self.db["tests"].find_one({"test_code": test_code})
        if not test_doc:
            return {"codigo": test_code, "nombre": test_code, "total_cantidad": 0, "total_monto": 0, "detalles_por_entidad": []}
            
        base_price = test_doc.get("price", 0)
        aggs = {agg["entity_name"]: agg["price"] for agg in test_doc.get("agreements", []) if "entity_name" in agg}
        test_name = test_doc.get("name", test_code)

        pipeline = [
            {
                "$match": {
                    "date_info.0.created_at": {"$gte": start, "$lt": end},
                    "samples.tests.id": test_code
                }
            },
            {"$unwind": "$samples"},
            {"$unwind": "$samples.tests"},
            {
                "$match": {"samples.tests.id": test_code}
            },
            {
                "$group": {
                    "_id": "$patient_info.entity_info.entity_name",
                    "cantidad": {"$sum": "$samples.tests.quantity"}
                }
            }
        ]

        raw_entities = list(self.cases.aggregate(pipeline))
        
        details = []
        total_qty = 0
        total_monto = 0.0
        
        for re in raw_entities:
            ent_name = re["_id"] or "Sin entidad"
            qty = re["cantidad"]
            
            agg_price = aggs.get(ent_name)
            has_agreement = agg_price is not None
            price_used = agg_price if has_agreement else base_price
            
            monto = qty * price_used
            
            details.append({
                "entidad": ent_name,
                "cantidad": qty,
                "precio_unitario": price_used,
                "monto": monto,
                "tiene_convenio": has_agreement
            })
            
            total_qty += qty
            total_monto += monto
            
        return {
            "codigo": test_code,
            "nombre": test_name,
            "total_cantidad": total_qty,
            "total_monto": total_monto,
            "detalles_por_entidad": sorted(details, key=lambda x: x["monto"], reverse=True)
        }
