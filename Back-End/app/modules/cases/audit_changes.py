"""Textos en español para entradas de auditoría al editar un caso."""

from __future__ import annotations

import json
from typing import Any


def _norm_str(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _get_from_case(doc: dict, dotted: str) -> Any:
    if "." not in dotted:
        return doc.get(dotted)
    cur: Any = doc
    for p in dotted.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(p)
    return cur


def _json_sig(v: Any) -> str:
    try:
        return json.dumps(v, sort_keys=True, default=str)
    except (TypeError, ValueError):
        return str(v)


def max_opportunity_days_from_case(doc: dict | None) -> float | None:
    """Valor persistido en opportunity_info[0].max_opportunity_time (no en la raíz del caso)."""
    if not doc:
        return None
    oi = doc.get("opportunity_info") or []
    if not oi or not isinstance(oi[0], dict):
        return None
    raw = oi[0].get("max_opportunity_time")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _fmt_days_display(v: Any) -> str:
    """Evita mostrar 'None' en textos de auditoría."""
    if v is None:
        return "sin dato"
    try:
        x = float(v)
        if abs(x - round(x)) < 1e-9:
            return str(int(round(x)))
        return str(round(x, 2)).rstrip("0").rstrip(".")
    except (TypeError, ValueError):
        return "sin dato"


_PATIENT_FIELD_LABELS: dict[str, str] = {
    "identification_type": "Tipo de documento",
    "identification_number": "Número de documento",
    "first_name": "Primer nombre",
    "second_name": "Segundo nombre",
    "first_lastname": "Primer apellido",
    "second_lastname": "Segundo apellido",
    "full_name": "Nombre completo",
    "birth_date": "Fecha de nacimiento",
    "age_at_diagnosis": "Edad al diagnóstico",
    "gender": "Sexo",
    "phone": "Teléfono",
    "email": "Correo electrónico",
    "care_type": "Tipo de atención",
    "observations": "Observaciones del paciente",
}


def describe_patient_info_changes(old_pi: dict | None, incoming: dict | None) -> list[str]:
    """Cambios en el bloque patient_info del caso respecto al snapshot anterior."""
    lines: list[str] = []
    old_pi = old_pi or {}
    incoming = incoming or {}
    for k, nv in incoming.items():
        if k == "patient_id":
            continue
        ov = old_pi.get(k)
        if k == "entity_info" and isinstance(nv, dict):
            oe = ov if isinstance(ov, dict) else {}
            for ek, lab in (
                ("entity_name", "Entidad (paciente)"),
                ("eps_name", "EPS"),
            ):
                if ek not in nv:
                    continue
                ovv, evv = oe.get(ek), nv.get(ek)
                if _json_sig(ovv) != _json_sig(evv):
                    lines.append(f"{lab}: «{_norm_str(ovv) or '—'}» → «{_norm_str(evv) or '—'}»")
            continue
        if k == "location" and isinstance(nv, dict):
            ol = ov if isinstance(ov, dict) else {}
            for lk, lab in (
                ("country", "País"),
                ("department", "Departamento"),
                ("municipality", "Municipio"),
                ("subregion", "Subregión"),
                ("address", "Dirección"),
            ):
                if lk not in nv:
                    continue
                if _json_sig(ol.get(lk)) != _json_sig(nv.get(lk)):
                    lines.append(f"{lab}: modificado")
            continue
        if _json_sig(ov) != _json_sig(nv):
            label = _PATIENT_FIELD_LABELS.get(k, k)
            if k == "observations":
                lines.append(f"{label}: contenido modificado")
            elif k in ("full_name",):
                lines.append(f"{label}: actualizado")
            else:
                lines.append(f"{label}: «{_fmt_cell(ov)}» → «{_fmt_cell(nv)}»")
    return lines[:40]


def _fmt_cell(v: Any) -> str:
    if v is None:
        return "—"
    if isinstance(v, (dict, list)):
        return "…"
    s = str(v).strip()
    return s[:80] + ("…" if len(s) > 80 else "") or "—"


def _flatten_tests(samples: list | None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for si, s in enumerate(samples or []):
        region = _norm_str(s.get("body_region"))
        for t in s.get("tests") or []:
            code = _norm_str(t.get("test_code"))
            if not code:
                continue
            tid_raw = t.get("id")
            tid_s = _norm_str(tid_raw) if tid_raw is not None else ""
            out.append({
                "tid": tid_s,
                "si": si,
                "region": region,
                "code": code,
                "qty": int(t.get("quantity") or 1),
                "name": _norm_str(t.get("name")) or code,
            })
    return out


def describe_samples_changes(old_samples: list | None, new_samples: list | None) -> list[str]:
    """Cambios entre listas de muestras/pruebas (empareo por id de prueba y por muestra+código)."""
    old_rows = _flatten_tests(old_samples)
    new_rows = _flatten_tests(new_samples)
    old_matched: set[int] = set()
    new_matched: set[int] = set()
    lines: list[str] = []

    # 1) Por id de línea de prueba
    old_by_id: dict[str, int] = {}
    for i, r in enumerate(old_rows):
        tid = r["tid"]
        if tid and tid not in old_by_id:
            old_by_id[tid] = i

    for j, nr in enumerate(new_rows):
        tid = nr["tid"]
        if not tid or tid not in old_by_id:
            continue
        i = old_by_id[tid]
        if i in old_matched:
            continue
        old_matched.add(i)
        new_matched.add(j)
        orow = old_rows[i]
        if orow["qty"] != nr["qty"]:
            lines.append(
                f"Prueba {nr['code']} ({nr['name']}): cantidad {orow['qty']} → {nr['qty']}"
            )
        if _norm_str(orow["region"]) != _norm_str(nr["region"]):
            lines.append(
                f"Prueba {nr['code']}: región de muestra «{orow['region'] or '—'}» → «{nr['region'] or '—'}»"
            )
        if _norm_str(orow["name"]) != _norm_str(nr["name"]):
            lines.append(f"Prueba {nr['code']}: nombre actualizado")

    # 2) Por (índice muestra, código) en no emparejados
    old_unmatched = [i for i in range(len(old_rows)) if i not in old_matched]
    new_unmatched = [j for j in range(len(new_rows)) if j not in new_matched]
    old_by_pos: dict[tuple[int, str], int] = {}
    for i in old_unmatched:
        r = old_rows[i]
        old_by_pos[(r["si"], r["code"])] = i

    still_new: list[int] = []
    for j in new_unmatched:
        nr = new_rows[j]
        key = (nr["si"], nr["code"])
        if key in old_by_pos:
            i = old_by_pos.pop(key)
            old_matched.add(i)
            new_matched.add(j)
            orow = old_rows[i]
            if orow["qty"] != nr["qty"]:
                lines.append(
                    f"Prueba {nr['code']} ({nr['name']}): cantidad {orow['qty']} → {nr['qty']}"
                )
            if _norm_str(orow["region"]) != _norm_str(nr["region"]):
                lines.append(
                    f"Prueba {nr['code']}: región «{orow['region'] or '—'}» → «{nr['region'] or '—'}»"
                )
            if _norm_str(orow["name"]) != _norm_str(nr["name"]):
                lines.append(f"Prueba {nr['code']}: nombre actualizado")
        else:
            still_new.append(j)

    # 3) Eliminadas / añadidas
    for i in range(len(old_rows)):
        if i not in old_matched:
            r = old_rows[i]
            lines.append(f"Prueba eliminada: {r['code']} ({r['name']}) ×{r['qty']}")
    for j in still_new:
        r = new_rows[j]
        lines.append(f"Prueba añadida: {r['code']} ({r['name']}) ×{r['qty']}")

    return lines


# Campos planos o con notación punto según el payload que envía CaseService al repositorio
_CASE_FIELD_LABELS: dict[str, str] = {
    "priority": "Prioridad",
    "requesting_physician": "Médico solicitante",
    "service": "Servicio",
    "observations": "Observaciones",
    "state": "Estado",
    "max_opportunity_time": "Días máx. de oportunidad",
    "delivered_to": "Entregado a",
    "patient_info.care_type": "Tipo de atención",
    "patient_info.entity_info.entity_name": "Entidad (ruta/EPS en paciente)",
    "assigned_pathologist": "Patólogo asignado",
    "assistant_pathologists": "Patólogos auxiliares",
    "assigned_resident": "Residente asignado",
}


def describe_case_edit_details(existing: dict, payload: dict) -> list[str]:
    """Lista de frases en español; vacía si no hay diff detectable."""
    lines: list[str] = []

    if "samples" in payload:
        lines.extend(describe_samples_changes(existing.get("samples"), payload.get("samples")))

    entity_from_payload = "entity" in payload
    if entity_from_payload:
        en = payload.get("entity") or {}
        eo = existing.get("entity") or {}
        if isinstance(en, dict):
            new_name = _norm_str(en.get("name"))
            old_name = _norm_str(eo.get("name")) if isinstance(eo, dict) else ""
            if new_name != old_name:
                lines.append(f"Entidad del caso: «{old_name or '—'}» → «{new_name or '—'}»")

    for key, label in _CASE_FIELD_LABELS.items():
        if key not in payload:
            continue
        if entity_from_payload and key == "patient_info.entity_info.entity_name":
            continue
        nv = payload[key]
        if key == "max_opportunity_time":
            ovf = max_opportunity_days_from_case(existing)
            try:
                nvf = float(nv) if nv is not None else None
            except (TypeError, ValueError):
                nvf = None
            if ovf != nvf:
                lines.append(
                    f"{label}: {_fmt_days_display(ovf)} → {_fmt_days_display(nvf)}"
                )
            continue
        ov = _get_from_case(existing, key)
        if _json_sig(ov) != _json_sig(nv):
            if key == "observations":
                lines.append(f"{label}: contenido modificado")
            elif key in ("assigned_pathologist", "assistant_pathologists", "assigned_resident"):
                lines.append(f"{label}: actualizado")
            elif key == "state":
                lines.append(f"{label}: «{_norm_str(ov) or '—'}» → «{_norm_str(nv) or '—'}»")
            else:
                lines.append(f"{label}: modificado")

    return lines[:40]
