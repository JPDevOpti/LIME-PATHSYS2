from typing import TYPE_CHECKING

from fastapi import Depends
from pymongo.database import Database

from app.database import get_db

if TYPE_CHECKING:
    from app.modules.cases.repository import CaseRepository
    from app.modules.cases.service import CaseService
    from app.modules.patients.repository import PatientRepository
    from app.modules.patients.service import PatientService


def get_patient_repository(db: Database = Depends(get_db)) -> "PatientRepository":
    from app.modules.patients.repository import PatientRepository
    return PatientRepository(db)


def get_patient_service(db: Database = Depends(get_db)) -> "PatientService":
    from app.modules.patients.repository import PatientRepository
    from app.modules.patients.service import PatientService
    from app.modules.cases.repository import CaseRepository
    from app.modules.users.repository import UsersRepository
    return PatientService(PatientRepository(db), CaseRepository(db), UsersRepository(db))


def get_case_repository(db: Database = Depends(get_db)) -> "CaseRepository":
    from app.modules.cases.repository import CaseRepository
    return CaseRepository(db)


def get_case_service(db: Database = Depends(get_db)) -> "CaseService":
    from app.modules.cases.repository import CaseRepository
    from app.modules.cases.service import CaseService
    from app.modules.patients.repository import PatientRepository
    return CaseService(CaseRepository(db), PatientRepository(db))
