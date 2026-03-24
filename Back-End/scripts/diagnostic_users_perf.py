import time
import re
import os
from typing import Any, Optional
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

# --- CONFIGURACIÓN (Extraída de tus settings) ---
MONGODB_URI = "mongodb+srv://juanpablorestrepo2020:RwDzfZCJskMeCiBP@cluster0.myvykk4.mongodb.net/"
DATABASE_NAME = "pathsys"

def format_iso_datetime(dt: datetime | None) -> str | None:
    if dt is None: return None
    if not isinstance(dt, datetime): return str(dt)
    return dt.isoformat()

class PerfTester:
    def __init__(self):
        print(f"[*] Conectando a MongoDB: {DATABASE_NAME}...")
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[DATABASE_NAME]
        self.collection = self.db.get_collection("users")

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        # Réplica exacta del método del repositorio
        out: dict[str, Any] = {
            "id": str(doc.get("_id", "")),
            "name": doc.get("name", ""),
            "email": doc.get("email"),
            "role": doc.get("role", ""),
            "is_active": doc.get("is_active", True),
        }
        if "created_at" in doc: out["created_at"] = format_iso_datetime(doc.get("created_at"))
        if "updated_at" in doc: out["updated_at"] = format_iso_datetime(doc.get("updated_at"))
        
        code = (
            doc.get("administrator_code")
            or doc.get("pathologist_code")
            or doc.get("resident_code")
            or doc.get("billing_code")
            or doc.get("visitante_code")
            or doc.get("auxiliar_code")
        )
        if code or any(f in doc for f in ["administrator_code", "pathologist_code", "resident_code", "billing_code", "visitante_code", "auxiliar_code"]):
            out["code"] = code
            
        if "document" in doc: out["document"] = doc.get("document")
        if "initials" in doc: out["initials"] = doc.get("initials")
        if "medical_license" in doc: out["medical_license"] = doc.get("medical_license")
        if "observations" in doc: out["observations"] = doc.get("observations")
        if "signature" in doc: out["signature"] = doc.get("signature", "")
        return out

    def run_test(self, exclude_patients=True, limit=100, use_projection=True):
        print(f"\n--- INICIANDO TEST (Pacientes excluidos: {exclude_patients}, Proyección: {use_projection}, Límite: {limit}) ---")
        
        q = {}
        if exclude_patients:
            q["role"] = {"$nin": ["paciente", "patient", "PACIENTE"]}
        
        fields = [
            "id", "name", "email", "role", "is_active", "created_at", 
            "administrator_code", "pathologist_code", "resident_code", 
            "auxiliar_code", "initials", "medical_license"
        ]
        projection = {f: 1 for f in fields} if use_projection else None
        if projection and "id" in projection:
            projection["_id"] = 1
            del projection["id"]

        # 1. Medir Conteo Total
        t0 = time.time()
        total = self.collection.count_documents(q)
        t1 = time.time()
        print(f"[1] count_documents: {t1-t0:.4f}s (Total encontrados: {total})")

        # 2. Medir Consulta (Cursor)
        t0 = time.time()
        cursor = self.collection.find(q, projection).sort("name", 1).limit(limit)
        # Forzar ejecución del cursor convirtiéndolo a lista de crudos
        raw_docs = list(cursor)
        t1 = time.time()
        print(f"[2] find().sort().limit() (Raw fetching): {t1-t0:.4f}s (Docs devueltos: {len(raw_docs)})")

        # 3. Medir Transformación (Mapeo a dicts)
        t0 = time.time()
        data = [self._doc_to_dict(d) for d in raw_docs]
        t1 = time.time()
        print(f"[3] Transformación (_doc_to_dict): {t1-t0:.4f}s")

        # 4. Medir Validación (Simulando Pydantic - Opcional si tienes el entorno instalado)
        try:
            from pydantic import TypeAdapter
            from app.modules.users.schemas import UserResponse
            t0 = time.time()
            adapter = TypeAdapter(list[UserResponse])
            adapter.validate_python(data)
            t1 = time.time()
            print(f"[4] Validación Pydantic: {t1-t0:.4f}s")
        except ImportError:
            print("[4] Pydantic no disponible en este entorno de script")

        print("-" * 50)
        return t1 - t0

if __name__ == "__main__":
    tester = PerfTester()
    # Test 1: Con exclusión y proyección (Lo que acabamos de optimizar)
    tester.run_test(exclude_patients=True, limit=500, use_projection=True)
    
    # Test 2: SIN exclusión de pacientes (Lo que causaba lentitud antes)
    tester.run_test(exclude_patients=False, limit=500, use_projection=False)
    
    # Test 3: Búsqueda específica (simulando filtro de nombre)
    print("\nSimulando búsqueda por nombre 'Juan'...")
    q_search = {"name": {"$regex": "Juan", "$options": "i"}}
    t0 = time.time()
    list(tester.collection.find(q_search).limit(100))
    print(f"Búsqueda regex: {time.time()-t0:.4f}s")
