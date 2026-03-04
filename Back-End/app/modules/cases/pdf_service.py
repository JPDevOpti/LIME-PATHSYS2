from __future__ import annotations

import base64
import mimetypes
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

from bson import ObjectId  # type: ignore[import-not-found]
from jinja2 import (  # type: ignore[import-not-found]
    Environment,
    FileSystemLoader,
    select_autoescape,
)
from markupsafe import Markup
from pymongo.database import Database  # type: ignore[import-not-found]
from weasyprint import HTML  # type: ignore[import-not-found]

from app.modules.cases.service import CaseService

METHOD_VALUE_TO_LABEL = {
    "hematoxilina-eosina": "Hematoxilina-Eosina",
    "inmunohistoquimica-polimero-peroxidasa": "Inmunohistoquímica: Polímero-Peroxidasa",
    "coloraciones-especiales": "Coloraciones histoquímicas",
    "inmunofluorescencia-metodo-directo": "Inmunofluorescencia: método directo",
    "microscopia-electronica-transmision": "Microscopía electrónica de transmisión",
}


class CasePdfService:
    def __init__(self, case_service: CaseService, db: Database):
        self.case_service = case_service
        self.db = db
        templates_dir = Path(__file__).parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            enable_async=False,
        )
        self._header_context = self._build_header_context()

    def generate_case_pdf_by_id(self, case_id: str) -> tuple[bytes, str]:
        case = self.case_service.get_by_id(case_id)
        prepared = self._prepare_case(case)
        pdf_bytes = self._render_pdf([prepared])
        return pdf_bytes, prepared.get("case_code") or case_id

    def generate_case_pdf_by_code(self, case_code: str) -> tuple[bytes, str]:
        case = self.case_service.get_by_code(case_code)
        prepared = self._prepare_case(case)
        pdf_bytes = self._render_pdf([prepared])
        return pdf_bytes, prepared.get("case_code") or case_code

    def generate_batch_pdf(
        self, case_ids: list[str] | None = None, case_codes: list[str] | None = None
    ) -> bytes:
        case_ids = case_ids or []
        case_codes = case_codes or []

        if not case_ids and not case_codes:
            raise ValueError("Debe enviar al menos un case_id o case_code")

        prepared_cases: list[dict[str, Any]] = []

        for case_id in case_ids:
            case = self.case_service.get_by_id(case_id)
            prepared_cases.append(self._prepare_case(case))

        for case_code in case_codes:
            case = self.case_service.get_by_code(case_code)
            prepared_cases.append(self._prepare_case(case))

        if not prepared_cases:
            raise ValueError("No se encontraron casos para generar el PDF")

        return self._render_pdf(prepared_cases)

    def _render_pdf(self, prepared_cases: list[dict[str, Any]]) -> bytes:
        template = self.jinja_env.get_template("case_report_pdf.html")
        html = template.render(cases=prepared_cases, header=self._header_context)
        pdf_bytes = HTML(string=html).write_pdf()
        if pdf_bytes is None:
            raise ValueError("WeasyPrint no pudo generar el PDF")
        return pdf_bytes

    def _build_header_context(self) -> dict[str, str]:
        repo_root = Path(__file__).resolve().parents[4]
        public_dir = repo_root / "Front-End" / "public"

        unified_banner = self._file_to_data_uri(public_dir / "Logos-PDF.png")

        return {
            "document_code": "F-025-LIME",
            "document_version": "06",
            "title": "INFORME DE RESULTADOS",
            "unified_banner": unified_banner,
        }

    def _file_to_data_uri(self, file_path: Path) -> str:
        if not file_path.exists():
            return ""

        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "image/png"

        content = file_path.read_bytes()
        encoded = base64.b64encode(content).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    _SIGNED_STATES = {"Por entregar", "Completado"}

    def _get_date_from_date_info(self, case: dict[str, Any], field: str) -> str | None:
        """Extrae un timestamp de date_info por nombre de campo."""
        date_info = case.get("date_info") or []
        if date_info and isinstance(date_info, list) and isinstance(date_info[0], dict):
            return date_info[0].get(field)
        return None

    def _prepare_case(self, case: dict[str, Any]) -> dict[str, Any]:
        patient_info = case.get("patient_info") or {}
        result = case.get("result") or {}
        location = patient_info.get("location") or {}

        case_state = str(case.get("state") or "").strip()
        is_signed = case_state in self._SIGNED_STATES

        pathologist_info = case.get("assigned_pathologist") or {}
        pathologist_meta = self._get_pathologist_meta(pathologist_info.get("id"))
        pathologist_name = pathologist_info.get("name") or ""

        assistants = case.get("assistant_pathologists") or []
        assistant_names = [a.get("name") for a in assistants if a.get("name")]

        all_pathologists = []
        if pathologist_name:
            all_pathologists.append(pathologist_name)
        all_pathologists.extend(assistant_names)

        participating_pathologists = (
            ", ".join(all_pathologists) if all_pathologists else "Sin asignar"
        )

        methods = result.get("method") or []
        if not isinstance(methods, list):
            methods = [methods] if methods else []

        cie10 = result.get("cie10_diagnosis") or {}
        cieo = result.get("cieo_diagnosis") or {}
        complementary_tests = case.get("complementary_tests") or []
        additional_notes = case.get("additional_notes") or []
        case_code = case.get("case_code") or ""

        # Leer todas las fechas desde date_info (fuente centralizada)
        sample_reception_date = self._get_date_from_date_info(case, "created_at")
        sample_day, sample_month, sample_year = self._split_date_parts(
            sample_reception_date
        )
        transcription_date = self._format_date(
            self._get_date_from_date_info(case, "transcribed_at")
        )
        signature_date = self._format_date(
            self._get_date_from_date_info(case, "signed_at")
        )
        additional_tests_display = self._format_complementary_tests(complementary_tests)
        additional_notes_display = (
            [str(n).strip() for n in additional_notes if str(n).strip()]
            if isinstance(additional_notes, list)
            else []
        )
        additional_report_reason = case.get("complementary_tests_reason") or ""
        has_additional_report = bool(
            additional_tests_display
            or additional_notes_display
            or str(additional_report_reason).strip()
        )

        patient_residence = (location.get("municipality") or "").strip()

        previous_study = case.get("previous_study")
        if isinstance(previous_study, str) and previous_study.strip():
            previous_study_display = f"Sí _X_  No __ ({previous_study.strip()})"
        elif previous_study is True:
            previous_study_display = "Sí _X_  No __"
        elif previous_study is False:
            previous_study_display = "Sí __  No _X_"
        else:
            previous_study_display = "Sí __  No __"

        identification_type = patient_info.get("identification_type", "")
        identification_number = (
            patient_info.get("identification_number")
            or patient_info.get("patient_code")
            or ""
        )
        patient_document = (
            f"{identification_type}-{identification_number}"
            if identification_type
            else identification_number
        )

        age_val = patient_info.get("age_at_diagnosis") or patient_info.get("age")
        if age_val is not None and str(age_val).strip() != "":
            patient_age_display = (
                f"{age_val} años" if str(age_val).strip().isdigit() else str(age_val)
            )
        else:
            patient_age_display = self._format_age(None, patient_info.get("birth_date"))

        return {
            "case_code": case_code,
            "report_date": self._format_date(
                self._get_date_from_date_info(case, "signed_at")
                or self._get_date_from_date_info(case, "update_at")
            ),
            "patient_name": patient_info.get("full_name")
            or patient_info.get("name")
            or "",
            "patient_document": patient_document,
            "patient_hc": patient_document,
            "patient_phone": patient_info.get("phone") or "Sin dato",
            "patient_email": patient_info.get("email") or "Sin dato",
            "patient_residence": patient_residence or "Sin dato",
            "entity_name": (
                (patient_info.get("entity_info") or {}).get("entity_name")
                or (patient_info.get("entity_info") or {}).get("name")
                or ""
            ),
            "patient_age": patient_age_display,
            "patient_gender": patient_info.get("gender") or "",
            "sample_reception_day": sample_day,
            "sample_reception_month": sample_month,
            "sample_reception_year": sample_year,
            "sample_reception_date": self._format_date(sample_reception_date),
            "study_number": case_code,
            "previous_study_display": previous_study_display,
            "transcription_date": transcription_date,
            "signature_date": signature_date,
            "requesting_physician": case.get("requesting_physician") or "",
            "service": case.get("service") or "",
            "pathologist_name": pathologist_name,
            "participating_pathologists": participating_pathologists,
            "validated_by": pathologist_name or participating_pathologists,
            "pathologist_license": pathologist_meta.get("medical_license") or "",
            "pathologist_signature": pathologist_meta.get("signature") or ""
            if is_signed
            else "",
            "samples_summary": self._build_samples_summary(case.get("samples") or []),
            "methods_display": self._methods_to_display(methods),
            "has_additional_report": has_additional_report,
            "additional_tests_display": additional_tests_display,
            "additional_notes_display": additional_notes_display,
            "additional_report_reason_html": self._sanitize_html(
                additional_report_reason
            ),
            "macro_html": self._sanitize_html(result.get("macro_result")),
            "micro_html": self._sanitize_html(result.get("micro_result")),
            "diagnosis_html": self._sanitize_html(result.get("diagnosis")),
            "cie10": f"{cie10.get('code', '')} - {cie10.get('name', '')}".strip(" -")
            if cie10
            else "",
            "cieo": f"{cieo.get('code', '')} - {cieo.get('name', '')}".strip(" -")
            if cieo
            else "",
        }

    def _get_pathologist_meta(self, pathologist_id: str | None) -> dict[str, Any]:
        if not pathologist_id:
            return {}

        try:
            oid = ObjectId(pathologist_id)
        except Exception:
            return {}

        user = self.db.get_collection("users").find_one(
            {"_id": oid}, {"medical_license": 1, "signature": 1}
        )
        if not user:
            return {}

        signature = user.get("signature")
        if isinstance(signature, str) and signature.startswith("/"):
            signature = ""

        return {
            "medical_license": user.get("medical_license") or "",
            "signature": signature or "",
        }

    def _methods_to_display(self, methods: list[Any]) -> str:
        values: list[str] = []
        for value in methods:
            if not value:
                continue
            key = str(value).strip().lower()
            label = METHOD_VALUE_TO_LABEL.get(key, str(value).strip())
            if label:
                values.append(label)
        return ", ".join(values)

    def _build_samples_summary(self, samples: list[dict[str, Any]]) -> str:
        regions: list[str] = []
        for sample in samples:
            region = (sample.get("body_region") or "").strip()
            if region:
                regions.append(region)
        return ", ".join(regions)

    def _format_complementary_tests(self, tests: list[dict[str, Any]]) -> list[str]:
        formatted: list[str] = []
        for test in tests:
            if not isinstance(test, dict):
                continue
            name = str(test.get("name") or "").strip()
            code = str(test.get("code") or "").strip()
            quantity = test.get("quantity")

            title = name or code
            if not title:
                continue

            if quantity not in (None, ""):
                formatted.append(f"{title} (x{quantity})")
            else:
                formatted.append(title)

        return formatted

    def _format_date(self, value: Any) -> str:
        if not value:
            return ""
        parsed: datetime | None = None

        if isinstance(value, datetime):
            parsed = value
        elif isinstance(value, date):
            parsed = datetime.combine(value, datetime.min.time())
        elif isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return value[:10]

        if not parsed:
            return ""

        return parsed.strftime("%d/%m/%Y")

    def _format_age(self, age: Any, birth_date: Any) -> str:
        if age is not None and str(age) != "":
            return f"{age} años"

        if not birth_date:
            return ""

        try:
            if isinstance(birth_date, str):
                birth = datetime.fromisoformat(birth_date.replace("Z", "+00:00"))
            elif isinstance(birth_date, datetime):
                birth = birth_date
            else:
                return ""

            now = datetime.now(tz=birth.tzinfo)
            years = (
                now.year
                - birth.year
                - ((now.month, now.day) < (birth.month, birth.day))
            )
            return f"{max(years, 0)} años"
        except Exception:
            return ""

    def _sanitize_html(self, html: Any) -> Markup:
        if not html:
            return Markup("")

        clean = str(html)
        clean = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", clean)
        clean = re.sub(r"\son[a-zA-Z]+\s*=\s*(\".*?\"|\'.*?\'|[^\s>]+)", "", clean)

        allowed_tags = {
            "div",
            "span",
            "br",
            "p",
            "b",
            "strong",
            "i",
            "em",
            "u",
            "ul",
            "ol",
            "li",
            "sub",
            "sup",
        }

        def _filter_tag(match: re.Match[str]) -> str:
            tag_name = match.group(1).lower()
            return match.group(0) if tag_name in allowed_tags else ""

        clean = re.sub(r"</?([a-zA-Z0-9]+)(\b[^>]*)?>", _filter_tag, clean)
        return Markup(clean)

    def _split_date_parts(self, value: Any) -> tuple[str, str, str]:
        formatted = self._format_date(value)
        if not formatted:
            return "", "", ""

        parts = formatted.split("/")
        if len(parts) != 3:
            return "", "", ""

        day, month, year = parts
        return day, month, year
