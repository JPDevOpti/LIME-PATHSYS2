from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Optional
from zoneinfo import ZoneInfo

# Zona operativa del sistema (Colombia, sin horario de verano).
COLOMBIA_TZ = ZoneInfo("America/Bogota")


def format_iso_datetime(dt: datetime | None) -> str | None:
    """Returns an ISO 8601 string with 'Z' suffix for UTC, handling naive datetimes as UTC."""
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return str(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat().replace("+00:00", "Z")


def is_iso_calendar_date_only(s: str) -> bool:
    s = s.strip()
    if len(s) != 10 or s[4] != "-" or s[7] != "-":
        return False
    parts = s.split("-")
    if len(parts) != 3:
        return False
    return parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit()


def colombia_local_day_start_utc(y: int, m: int, d: int) -> datetime:
    """Inicio del día civil en Colombia como instante en UTC (para consultas Mongo)."""
    local = datetime(y, m, d, 0, 0, 0, tzinfo=COLOMBIA_TZ)
    return local.astimezone(UTC)


def colombia_calendar_month_range_utc(year: int, month: int) -> tuple[datetime, datetime]:
    """Mes calendario en Colombia: [start, end) en UTC."""
    start = colombia_local_day_start_utc(year, month, 1)
    if month == 12:
        end = colombia_local_day_start_utc(year + 1, 1, 1)
    else:
        end = colombia_local_day_start_utc(year, month + 1, 1)
    return start, end


def mongo_created_at_range_from_strings(
    created_at_from: Optional[str], created_at_to: Optional[str]
) -> Optional[dict[str, Any]]:
    """
    Rango para campos almacenados en UTC.
    YYYY-MM-DD: día civil en Colombia (medianoche Bogotá → UTC).
    ISO con hora: comportamiento previo (instantes explícitos; fin en día UTC +1 si aplica).
    """
    if not created_at_from and not created_at_to:
        return None
    q: dict[str, Any] = {}

    if created_at_from:
        s = created_at_from.strip()
        if is_iso_calendar_date_only(s):
            y, m, d = int(s[0:4]), int(s[5:7]), int(s[8:10])
            q["$gte"] = colombia_local_day_start_utc(y, m, d)
        else:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=UTC)
            q["$gte"] = dt

    if created_at_to:
        s = created_at_to.strip()
        if is_iso_calendar_date_only(s):
            y, m, d = int(s[0:4]), int(s[5:7]), int(s[8:10])
            local_end = datetime(y, m, d, 0, 0, 0, tzinfo=COLOMBIA_TZ) + timedelta(days=1)
            q["$lt"] = local_end.astimezone(UTC)
        else:
            end = datetime.fromisoformat(s.replace("Z", "+00:00"))
            if end.tzinfo is None:
                end = end.replace(tzinfo=UTC)
            end = end.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            q["$lt"] = end

    return q if q else None
