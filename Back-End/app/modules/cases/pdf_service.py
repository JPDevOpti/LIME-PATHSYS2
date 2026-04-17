from __future__ import annotations

import base64
import mimetypes
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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
    _SIGNED_STATES = {"Por entregar", "Completado"}

    def __init__(self, case_service: CaseService, db: Database):
        self.case_service = case_service
        self.db = db
        # Raíz del backend (monorepo: carpeta Back-End; Docker: /app). Evitar parents[4] en
        # imagen solo-Back-End: apunta al raíz del FS y no existe Front-End/public.
        self._back_end_root = Path(__file__).resolve().parents[3]
        parent = self._back_end_root.parent
        self._repo_root = (
            parent
            if (parent / "Front-End").is_dir()
            else self._back_end_root
        )
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
        return pdf_bytes, self._build_pdf_filename_base(prepared, case_id)

    def generate_case_pdf_by_code(self, case_code: str) -> tuple[bytes, str]:
        case = self.case_service.get_by_code(case_code)
        prepared = self._prepare_case(case)
        pdf_bytes = self._render_pdf([prepared])
        return pdf_bytes, self._build_pdf_filename_base(prepared, case_code)

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
        html = template.render(
            cases=prepared_cases,
            header=self._header_context,
        )
        document = HTML(string=html).render()
        document.metadata.title = None
        pdf_bytes = document.write_pdf(finisher=self._remove_pdf_title_metadata)
        if pdf_bytes is None:
            raise ValueError("WeasyPrint no pudo generar el PDF")
        return pdf_bytes

    def _remove_pdf_title_metadata(self, _document: Any, pdf: Any) -> None:
        info = getattr(pdf, "info", None)
        if info is None:
            return
        info.pop("Title", None)
        info.pop("title", None)

    def _build_pdf_filename_base(
        self, prepared_case: dict[str, Any], fallback_case_code: str
    ) -> str:
        case_code = self._normalize_filename_part(
            str(prepared_case.get("case_code") or fallback_case_code).strip()
        )
        patient_name = self._normalize_filename_part(
            str(prepared_case.get("patient_name") or "").strip()
        )

        if patient_name:
            filename_base = f"{case_code}-{patient_name}"
        else:
            filename_base = case_code

        return filename_base

    def _normalize_filename_part(self, value: str) -> str:
        normalized = re.sub(r"\s+", "_", value.strip())
        normalized = re.sub(r"[^0-9A-Za-zÁÉÍÓÚáéíóúÑñÜü_-]", "", normalized)
        normalized = re.sub(r"_+", "_", normalized)
        return normalized.strip("_-")

    def _build_header_context(self) -> dict[str, str]:
        # Prioridad: asset junto al template (Docker); si no, monorepo Front-End/public.
        banner_path = Path(__file__).resolve().parent / "static" / "Logos-PDF.png"
        if not banner_path.exists():
            banner_path = self._repo_root / "Front-End" / "public" / "Logos-PDF.png"

        unified_banner = self._file_to_data_uri(banner_path)

        return {
            "document_code": "F-025-LIME",
            "document_version": "06",
            "title": "INFORME DE RESULTADOS ANATOMOPATOLÓGICOS",
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
        pathologist_meta = self._get_pathologist_meta(
            pathologist_code=pathologist_info.get("pathologist_code"),
            pathologist_id=pathologist_info.get("id"),
            pathologist_name=pathologist_info.get("name"),
        )
        pathologist_name = pathologist_info.get("name") or ""

        assistants = case.get("assistant_pathologists") or []

        # Separar residentes de patólogos asistentes
        resident_names: list[str] = []
        assistant_names: list[str] = []
        for a in assistants:
            name = a.get("name")
            if not name:
                continue
            role = a.get("role") or self._resolve_user_role(a.get("id"))
            if role == "resident":
                resident_names.append(name)
            else:
                assistant_names.append(name)

        all_pathologists = []
        if pathologist_name:
            all_pathologists.append(pathologist_name)
        all_pathologists.extend(assistant_names)

        participating_pathologists = (
            ", ".join(all_pathologists) if all_pathologists else "Sin asignar"
        )

        resident_name = ", ".join(resident_names) if resident_names else ""

        methods = result.get("method") or []
        if not isinstance(methods, list):
            methods = [methods] if methods else []

        cie10 = result.get("cie10_diagnosis") or {}
        cieo = result.get("cieo_diagnosis") or {}
        complementary_tests = case.get("complementary_tests") or []
        additional_notes = case.get("additional_notes") or []
        case_code = case.get("case_code") or ""

        sample_reception_date = self._get_date_from_date_info(case, "created_at")
        transcription_date = self._format_date(
            self._get_date_from_date_info(case, "transcribed_at")
        )
        signature_date = self._format_date(
            self._get_date_from_date_info(case, "signed_at")
        )
        additional_tests_display = self._format_complementary_tests(complementary_tests)
        additional_notes_display = []
        if isinstance(additional_notes, list):
            for n in additional_notes:
                if isinstance(n, dict):
                    t = str(n.get("text") or "").strip()
                    if not t:
                        continue
                    raw_date = str(n.get("date") or "").strip()
                    if raw_date:
                        try:
                            dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                            formatted = dt.strftime("%-d de %B de %Y, %H:%M")
                        except Exception:
                            formatted = raw_date
                        additional_notes_display.append(f"{formatted} — {t}")
                    else:
                        additional_notes_display.append(t)
                elif str(n).strip():
                    additional_notes_display.append(str(n).strip())
        additional_report_reason = case.get("complementary_tests_reason") or ""
        has_additional_report = bool(
            additional_tests_display
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

        patient_name = patient_info.get("full_name") or patient_info.get("name") or ""

        return {
            "case_code": case_code,
            "report_date": self._format_date(
                self._get_date_from_date_info(case, "signed_at")
                or self._get_date_from_date_info(case, "update_at")
            ),
            "patient_name": patient_name,
            "patient_document": patient_document,
            "patient_phone": patient_info.get("phone") or "Sin dato",
            "patient_email": patient_info.get("email") or "Sin dato",
            "patient_residence": patient_residence or "Sin dato",
            "entity_name": (
                (case.get("entity") or {}).get("name")
                if isinstance(case.get("entity"), dict)
                else (case.get("entity") or "")
            ) or (
                (patient_info.get("entity_info") or {}).get("entity_name")
                or (patient_info.get("entity_info") or {}).get("name")
                or ""
            ),
            "patient_age": patient_age_display,
            "patient_gender": patient_info.get("gender") or "",
            "sample_reception_date": self._format_date(sample_reception_date),
            "previous_study_display": previous_study_display,
            "transcription_date": transcription_date,
            "signature_date": signature_date,
            "requesting_physician": case.get("requesting_physician") or "",
            "service": case.get("service") or "",
            "pathologist_name": pathologist_name,
            "participating_pathologists": participating_pathologists,
            "validated_by": pathologist_name or participating_pathologists,
            "resident_name": resident_name,
            "assistant_names": assistant_names,
            "pathologist_license": pathologist_meta.get("medical_license") or "",
            "pathologist_signature": pathologist_meta.get("signature") if is_signed else "",
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

    def _get_pathologist_meta(
        self,
        pathologist_code: str | None,
        pathologist_id: str | None,
        pathologist_name: str | None = None,
    ) -> dict[str, Any]:
        users = self.db.get_collection("users")
        projection = {"medical_license": 1, "signature": 1, "name": 1}
        user = None

        pcode = str(pathologist_code or "").strip()
        if pcode:
            code_filters: list[dict] = [{"pathologist_code": pcode}]
            try:
                code_filters.append({"pathologist_code": int(pcode)})
            except (ValueError, TypeError):
                pass
            user = users.find_one({"$or": code_filters}, projection)

        pid = str(pathologist_id or "").strip()
        if not user and pid:
            # 1. Buscar por _id (ObjectId) — casos nuevos
            try:
                user = users.find_one({"_id": ObjectId(pid)}, projection)
            except Exception:
                pass

            # 2. Buscar por pathologist_code o document — casos legacy/importados
            if not user:
                code_filters: list[dict] = [
                    {"pathologist_code": pid},
                    {"document": pid},
                ]
                try:
                    pid_int = int(pid)
                    code_filters += [{"pathologist_code": pid_int}, {"document": pid_int}]
                except (ValueError, TypeError):
                    pass
                user = users.find_one({"$or": code_filters}, projection)

        # 3. Buscar por nombre
        normalized_name = str(pathologist_name or "").strip()
        if not user and normalized_name:
            user = users.find_one(
                {
                    "role": {
                        "$in": [
                            "pathologist",
                            "patologo",
                            "patólogo",
                            "PATHOLOGIST",
                            "PATOLOGO",
                            "PATÓLOGO",
                        ]
                    },
                    "name": {
                        "$regex": rf"^\s*{re.escape(normalized_name)}\s*$",
                        "$options": "i",
                    },
                },
                projection,
            )

        # 4. Fallback final por nombre sin filtrar role (datos legacy inconsistentes)
        if not user and normalized_name:
            user = users.find_one(
                {
                    "name": {
                        "$regex": rf"^\s*{re.escape(normalized_name)}\s*$",
                        "$options": "i",
                    }
                },
                projection,
            )

        if not user:
            return {}

        return {
            "medical_license": user.get("medical_license") or "",
            "signature": self._resolve_signature_for_pdf(user.get("signature")),
        }

    def _resolve_signature_for_pdf(self, value: Any) -> Markup | str:
        signature = str(value or "").strip()
        if not signature:
            return ""

        lowered = signature.lower()
        if lowered.startswith("data:image"):
            return Markup(signature)

        candidates: list[Path] = []

        if signature.startswith("/uploads/"):
            relative = signature.lstrip("/")
            candidates.append(self._repo_root / "Back-End" / relative)
            candidates.append(self._repo_root / relative)
        elif signature.startswith("uploads/"):
            candidates.append(self._repo_root / "Back-End" / signature)
            candidates.append(self._repo_root / signature)
        elif signature.startswith("/"):
            relative = signature.lstrip("/")
            candidates.append(self._repo_root / "Back-End" / relative)
            candidates.append(self._repo_root / relative)
        elif not lowered.startswith("http://") and not lowered.startswith("https://"):
            candidates.append(self._repo_root / "Back-End" / signature)
            candidates.append(self._repo_root / signature)
        elif lowered.startswith("http://") or lowered.startswith("https://"):
            parsed = urlparse(signature)
            path = parsed.path or ""
            marker = "/uploads/"
            if marker in path:
                relative = path[path.find(marker) + 1 :]
                candidates.append(self._repo_root / "Back-End" / relative)
                candidates.append(self._repo_root / relative)
            else:
                return Markup(signature)

        for candidate in candidates:
            data_uri = self._file_to_data_uri(candidate)
            if data_uri:
                return Markup(data_uri)

        if lowered.startswith("http://") or lowered.startswith("https://"):
            return Markup(signature)

        return ""

    def _resolve_user_role(self, user_id: str | None) -> str:
        """Consulta el role del usuario en la BD. Retorna '' si no lo encuentra."""
        if not user_id:
            return ""
        try:
            user = self.db.get_collection("users").find_one(
                {"_id": ObjectId(user_id)}, {"role": 1}
            )
            return str(user.get("role") or "") if user else ""
        except Exception:
            return ""

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

