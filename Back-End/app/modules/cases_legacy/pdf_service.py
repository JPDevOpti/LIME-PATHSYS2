from __future__ import annotations

import base64
from datetime import date, datetime
import mimetypes
from pathlib import Path
from typing import Any
import re
import urllib.parse
from fastapi import Response

from bson import ObjectId  # type: ignore[import-not-found]
from jinja2 import Environment, FileSystemLoader, select_autoescape  # type: ignore[import-not-found]
from markupsafe import Markup
from pymongo.database import Database  # type: ignore[import-not-found]
from weasyprint import HTML  # type: ignore[import-not-found]

from app.modules.cases_legacy.service import LegacyCaseService
from app.modules.cases_legacy.schemas import LegacyCaseResponse, LegacySampleSchema

METHOD_VALUE_TO_LABEL = {
    "hematoxilina-eosina": "Hematoxilina-Eosina",
    "inmunohistoquimica-polimero-peroxidasa": "Inmunohistoquímica: Polímero-Peroxidasa",
    "coloraciones-especiales": "Coloraciones histoquímicas",
    "inmunofluorescencia-metodo-directo": "Inmunofluorescencia: método directo",
    "microscopia-electronica-transmision": "Microscopía electrónica de transmisión",
}

class LegacyCasePdfService:
    def __init__(self, case_service: LegacyCaseService, db: Database):
        self.case_service = case_service
        self.db = db
        # We reuse the normal cases templates
        templates_dir = Path(__file__).parent.parent / "cases" / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            enable_async=False,
        )
        self._header_context = self._build_header_context()

    def generate_case_pdf_by_id(self, case_id: str) -> tuple[bytes, str]:
        case = self.case_service.get_case(case_id)
        if not case:
            raise ValueError(f"Caso legacy no encontrado: {case_id}")
        prepared = self._prepare_case(case)
        pdf_bytes = self._render_pdf([prepared])
        return pdf_bytes, prepared.get("case_code") or case_id

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

    def _prepare_case(self, case: LegacyCaseResponse) -> dict[str, Any]:
        # Unify Samples Information
        macro_text = ""
        micro_text = ""
        additional_tests_display = []
        additional_notes_display = []
        
        for sample in case.samples:
            prefix = ""
            if len(case.samples) > 1 and sample.number:
                prefix = f"<strong>Muestra {sample.number}:</strong> "
                
            if sample.macroscopic:
                macro_text += f"<p>{prefix}{sample.macroscopic}</p>"
            if sample.microscopic:
                micro_text += f"<p>{prefix}{sample.microscopic}</p>"
            
            # Combine histoquimica and inmunohistoquimica into additional tests
            if sample.histoquimica:
                test_str = f"Histoquímica: {sample.histoquimica}"
                if len(case.samples) > 1 and sample.number:
                    test_str = f"Muestra {sample.number} - {test_str}"
                additional_tests_display.append(test_str)
                
            if sample.inmunohistoquimica:
                test_str = f"Inmunohistoquímica: {sample.inmunohistoquimica}"
                if len(case.samples) > 1 and sample.number:
                    test_str = f"Muestra {sample.number} - {test_str}"
                additional_tests_display.append(test_str)
                
            if sample.note:
                note_str = sample.note
                if len(case.samples) > 1 and sample.number:
                    note_str = f"Muestra {sample.number}: {note_str}"
                additional_notes_display.append(note_str)

        has_additional_report = bool(additional_tests_display or additional_notes_display)

        # Basic Format Helpers
        transcription_date = self._format_date(case.transcription_date)
        signature_date = self._format_date(case.closed_at)
        sample_reception_date = self._format_date(case.received_at)
        sample_day, sample_month, sample_year = self._split_date_parts(case.received_at)

        patient_name = case.patient.full_name or ""
        patient_document = case.patient.identification or ""

        # Default empty values since legacy cases don't track the exact same fields as normal ones
        # Example: No pathologist tracking
        return {
            "case_code": case.legacy_id,
            "report_date": self._format_date(case.closed_at or case.imported_at),
            "patient_name": patient_name,
            "patient_document": patient_document,
            "patient_hc": patient_document,
            "patient_phone": "Sin dato",
            "patient_email": "Sin dato",
            "patient_residence": "Sin dato",
            "entity_name": case.entity or "Particular",
            "patient_age": "",
            "patient_gender": "",
            "sample_reception_day": sample_day,
            "sample_reception_month": sample_month,
            "sample_reception_year": sample_year,
            "sample_reception_date": sample_reception_date,
            "study_number": case.legacy_id,
            "previous_study_display": case.previous_study or "Sí __  No __",
            "transcription_date": transcription_date,
            "signature_date": signature_date,
            "requesting_physician": "",
            "service": case.care_type or "",
            "pathologist_name": "Histórico",
            "participating_pathologists": "Histórico",
            "validated_by": "Histórico",
            "pathologist_license": "",
            "pathologist_signature": "",
            "samples_summary": ", ".join([s.anatomical_location for s in case.samples if s.anatomical_location]),
            "methods_display": "Histórico",
            "has_additional_report": has_additional_report,
            "additional_tests_display": additional_tests_display,
            "additional_notes_display": additional_notes_display,
            "additional_report_reason_html": Markup(""),
            "macro_html": self._sanitize_html(macro_text),
            "micro_html": self._sanitize_html(micro_text),
            "diagnosis_html": self._sanitize_html(""), # Legacy diagnosis is often merged with micro
            "cie10": "",
            "cieo": "",
        }

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

    def _split_date_parts(self, value: Any) -> tuple[str, str, str]:
        formatted = self._format_date(value)
        if not formatted:
            return "", "", ""

        parts = formatted.split("/")
        if len(parts) != 3:
            return "", "", ""

        day, month, year = parts
        return day, month, year

    def _sanitize_html(self, html: Any) -> Markup:
        if not html:
            return Markup("")

        clean = str(html)
        clean = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", clean)
        clean = re.sub(r"\son[a-zA-Z]+\s*=\s*(\".*?\"|\'.*?\'|[^\s>]+)", "", clean)

        allowed_tags = {
            "div", "span", "br", "p", "b", "strong", "i", "em", "u", "ul", "ol", "li", "sub", "sup"
        }

        def _filter_tag(match: re.Match[str]) -> str:
            tag_name = match.group(1).lower()
            return match.group(0) if tag_name in allowed_tags else ""

        clean = re.sub(r"</?([a-zA-Z0-9]+)(\b[^>]*)?>", _filter_tag, clean)
        return Markup(clean)
