"""Field rules shared by the CRM's request shapes (DATA-3 to DATA-6).

Text is trimmed and its length checked; empty optional text is saved as empty
(None). A wrong field returns 422 with the field's name.
"""

import re
from typing import Annotated, Any

from pydantic import AfterValidator, BeforeValidator, EmailStr, Field, StringConstraints


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


_SCHEME = re.compile(r"[a-z][a-z0-9+.-]*://", re.IGNORECASE)


def _add_scheme(value: str | None) -> str | None:
    """A website gets https:// if it has no scheme."""
    if value is None or _SCHEME.match(value):
        return value
    return f"https://{value}"


def _text(max_length: int) -> Any:
    return Annotated[str, StringConstraints(max_length=max_length)]


Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
ShortText = Annotated[_text(200) | None, BeforeValidator(_blank_to_none)]
LongText = Annotated[_text(5000) | None, BeforeValidator(_blank_to_none)]
Phone = Annotated[_text(40) | None, BeforeValidator(_blank_to_none)]
Email = Annotated[EmailStr | None, BeforeValidator(_blank_to_none)]
Website = Annotated[_text(2000) | None, BeforeValidator(_blank_to_none), AfterValidator(_add_scheme)]
Money = Annotated[int, Field(ge=0, le=1_000_000_000)]
Probability = Annotated[int, Field(ge=0, le=100)]
