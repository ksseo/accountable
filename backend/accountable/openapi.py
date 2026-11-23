"""Writes the app's OpenAPI schema, for npm run api:types (API-9).

Run with: uv run python -m accountable.openapi <output.json>
Without a path it prints the schema.
"""

import json
import sys
from pathlib import Path

from accountable.main import create_app


def schema_text() -> str:
    return json.dumps(create_app().openapi(), indent=2, ensure_ascii=False) + "\n"


def main(argv: list[str]) -> int:
    text = schema_text()
    if argv:
        Path(argv[0]).write_text(text, encoding="utf-8", newline="\n")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
