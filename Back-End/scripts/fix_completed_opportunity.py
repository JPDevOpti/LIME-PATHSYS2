import os
import sys
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

# Añadir el directorio Back-End al path para poder importar core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.business_days import calculate_opportunity_days

# Configuración
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/lime_pathsys2")
DB_NAME = MONGO_URI.split("/")[-1] if "/" in MONGO_URI else "lime_pathsys2"
DEFAULT_MAX_OPPORTUNITY_TIME = 5.0

def get_db():
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]

def get_tests_time_map(db):
    """Crea un mapa de test_code -> time de la colección tests."""
    time_map = {}
    for test in db.tests.find({}, {"test_code": 1, "time": 1}):
        code = test.get("test_code")
        time = test.get("time")
        if code and time is not None:
            time_map[str(code).strip()] = float(time)
    return time_map

def pick_max_opportunity_time(samples, tests_time_map):
    """Calcula el tiempo máximo de oportunidad basado en las pruebas del caso."""
    max_time = DEFAULT_MAX_OPPORTUNITY_TIME
    for sample in samples or []:
        for t_info in sample.get("tests", []) or []:
            # Intentar por test_code primero, luego por id (que a veces es el código)
            code = str(t_info.get("test_code") or t_info.get("id") or "").strip()
            t_time = tests_time_map.get(code)
            if t_time is not None:
                max_time = max(max_time, t_time)
    return float(max_time)

def fix_cases():
    db = get_db()
    tests_time_map = get_tests_time_map(db)
    
    # Buscar casos:
    # 1. Completados (para asegurar que tengan opportunity_time y was_timely)
    # 2. Cualquier caso con max_opportunity_time <= 0
    query = {
        "$or": [
            {"state": "Completado"},
            {"opportunity_info.max_opportunity_time": {"$lte": 0}},
            {"opportunity_info.0.max_opportunity_time": {"$lte": 0}}
        ]
    }
    total_cases = db.cases.count_documents(query)
    print(f"Buscando en {total_cases} casos que requieren revisión...")

    fixed_count = 0
    skipped_count = 0

    for doc in db.cases.find(query):
        case_id = doc["_id"]
        case_code = doc.get("case_code", "S/C")
        state = doc.get("state")
        
        # Obtener fechas necesarias
        date_info_list = doc.get("date_info", [{}])
        if not date_info_list: date_info_list = [{}]
        date_info = date_info_list[0]
        
        created_at = date_info.get("created_at")
        signed_at = date_info.get("signed_at")
        
        # Si no hay created_at, no podemos calcular nada
        if not created_at:
            print(f"[{case_code}] ERROR: No tiene created_at. Saltando.")
            skipped_count += 1
            continue

        # El tiempo de oportunidad se mide hasta la firma (signed_at)
        # Si no hay signed_at y el caso está completado, buscamos alternativas
        if not signed_at and state == "Completado":
            signed_at = date_info.get("delivered_at")
            if not signed_at:
                # Buscar en audit_info el evento 'signed'
                for audit in reversed(doc.get("audit_info", [])):
                    if audit.get("action") == "signed":
                        signed_at = audit.get("timestamp")
                        break
            
            if not signed_at:
                signed_at = date_info.get("update_at") or datetime.now(timezone.utc)
        
        # Asegurar objetos datetime
        if created_at and isinstance(created_at, str): 
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        if signed_at and isinstance(signed_at, str): 
            signed_at = datetime.fromisoformat(signed_at.replace("Z", "+00:00"))

        # 1. Calcular tiempo de oportunidad transcurrido (si hay fecha final)
        opp_days = None
        if signed_at:
            opp_days = float(calculate_opportunity_days(created_at, signed_at))
        
        # 2. Calcular/Obtener tiempo máximo de oportunidad
        opp_info_list = doc.get("opportunity_info", [{}])
        if not opp_info_list: opp_info_list = [{}]
        opp_info = opp_info_list[0]
        
        current_max = opp_info.get("max_opportunity_time")
        # Si es 0 o None, recalculamos obligatoriamente
        if current_max is None or float(current_max) <= 0:
            new_max = pick_max_opportunity_time(doc.get("samples", []), tests_time_map)
            # print(f"[{case_code}] Recalculado max_opportunity_time: {new_max}")
        else:
            new_max = float(current_max)

        # 3. Determinar si fue oportuno (solo si tenemos opp_days)
        was_timely = None
        if opp_days is not None:
            was_timely = opp_days <= new_max

        # 4. Actualizar si hay cambios significativos
        # Si es un caso no completado, solo actualizamos max_opportunity_time si era 0
        needs_update = False
        if current_max != new_max:
            needs_update = True
        
        if state == "Completado":
            if opp_info.get("opportunity_time") != opp_days or opp_info.get("was_timely") != was_timely:
                needs_update = True

        if needs_update:
            new_opp_info = [{
                "opportunity_time": opp_days if opp_days is not None else opp_info.get("opportunity_time"),
                "max_opportunity_time": new_max,
                "was_timely": was_timely if was_timely is not None else opp_info.get("was_timely")
            }]
            
            db.cases.update_one(
                {"_id": case_id},
                {"$set": {"opportunity_info": new_opp_info}}
            )
            fixed_count += 1
        else:
            skipped_count += 1

    print(f"\nProceso finalizado.")
    print(f"Casos actualizados: {fixed_count}")
    print(f"Casos saltados/ya correctos: {skipped_count}")

if __name__ == "__main__":
    fix_cases()
