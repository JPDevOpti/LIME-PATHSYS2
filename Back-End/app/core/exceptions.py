from fastapi import HTTPException


def not_found_exception(resource: str, identifier: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{resource} not found: {identifier}")


def conflict_exception(message: str) -> HTTPException:
    return HTTPException(status_code=409, detail=message)
