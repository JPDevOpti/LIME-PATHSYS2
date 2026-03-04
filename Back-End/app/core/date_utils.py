from datetime import datetime, UTC

def format_iso_datetime(dt: datetime | None) -> str | None:
    """Returns an ISO 8601 string with 'Z' suffix for UTC, handling naive datetimes as UTC."""
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return str(dt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat().replace("+00:00", "Z")
