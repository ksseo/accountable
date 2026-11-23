"""Error responses with the same shape as FastAPI's own.

A wrong field returns 422 with the field's name in `loc`, as FastAPI does for
request validation, so the frontend reads every field error the same way.
"""

from fastapi import HTTPException


def field_error(field: str, message: str, kind: str = "value_error") -> HTTPException:
    return HTTPException(
        status_code=422,
        detail=[{"loc": ["body", field], "msg": message, "type": kind}],
    )


def not_found(what: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{what} not found")


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=409, detail=message)
