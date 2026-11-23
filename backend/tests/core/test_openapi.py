"""The committed OpenAPI schema matches the backend (API-9).

If this fails, run `npm run api:types` and commit the result.
"""

import json

from accountable.core.settings import BACKEND_DIR
from accountable.main import create_app

COMMITTED = BACKEND_DIR.parent / "frontend" / "src" / "api" / "openapi.json"


def test_the_committed_schema_matches_the_backend():
    committed = json.loads(COMMITTED.read_text(encoding="utf-8"))
    assert committed == create_app().openapi(), "Run `npm run api:types` to regenerate the frontend's types"
