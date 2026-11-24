"""Shared test setup.

Each test gets its own database file in a temp folder and today fixed at
2026-11-23. A test that would open backend/data/accountable.db stops the run.
"""

import sqlite3
from collections.abc import Callable, Iterator
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, Engine, Table, insert

from accountable.core.db import make_engine, migrate, write_connection
from accountable.core.settings import DEFAULT_DB_PATH, db_path
from accountable.crm.tables import deals
from accountable.main import create_app

TODAY = date(2026, 11, 23)

# The app only answers requests addressed to this computer.
BASE_URL = "http://127.0.0.1"

_real_connect = sqlite3.dbapi2.connect


def is_real_database(database: object) -> bool:
    try:
        return Path(str(database)).resolve() == DEFAULT_DB_PATH.resolve()
    except (OSError, ValueError):
        return False


def _guarded_connect(database, *args, **kwargs):
    if is_real_database(database):
        pytest.exit(f"A test tried to open the real database at {DEFAULT_DB_PATH}", returncode=3)
    return _real_connect(database, *args, **kwargs)


@pytest.fixture(autouse=True, scope="session")
def guard_real_database() -> Iterator[None]:
    """Every SQLite connection goes through sqlite3's connect, so guard it there."""
    sqlite3.dbapi2.connect = _guarded_connect
    sqlite3.connect = _guarded_connect
    try:
        yield
    finally:
        sqlite3.dbapi2.connect = _real_connect
        sqlite3.connect = _real_connect


@pytest.fixture(autouse=True)
def isolated_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ACCOUNTABLE_DB", str(tmp_path / "accountable.db"))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", TODAY.isoformat())


@pytest.fixture
def empty_db() -> Path:
    """A migrated database with no data. The file exists, so no sample is loaded."""
    path = db_path()
    engine = make_engine(path)
    migrate(engine)
    engine.dispose()
    return path


@pytest.fixture
def client(empty_db: Path) -> Iterator[TestClient]:
    """The app on an empty database."""
    with TestClient(create_app(), base_url=BASE_URL) as test_client:
        yield test_client


@pytest.fixture
def sample_client() -> Iterator[TestClient]:
    """The app on a new database, so it loads the sample data."""
    with TestClient(create_app(), base_url=BASE_URL) as test_client:
        yield test_client


@pytest.fixture
def engine(client: TestClient) -> Engine:
    return client.app.state.engine


@pytest.fixture
def conn(engine: Engine) -> Iterator[Connection]:
    """A write connection in a transaction, committed when the test ends."""
    with write_connection(engine) as connection, connection.begin():
        yield connection


@pytest.fixture
def add(conn: Connection) -> Callable[..., int]:
    """Inserts a row straight into a table and returns its id."""

    def insert_row(table: Table, **values) -> int:
        if table is deals:
            values.setdefault("stage", "new")
            values.setdefault("value", 10_000)
            values.setdefault("probability", 10)
            values.setdefault("position", 1024.0)
            values.setdefault("furthest_open_stage", "new")
        return conn.execute(insert(table).values(**values)).inserted_primary_key[0]

    return insert_row


def _ok(response) -> Any:
    assert response.status_code in (200, 201), response.text
    return response.json()


@pytest.fixture
def make_org(client: TestClient) -> Callable[..., dict]:
    def make(name: str = "한빛정밀", **fields) -> dict:
        return _ok(client.post("/api/organizations", json={"name": name, **fields}))

    return make


@pytest.fixture
def make_contact(client: TestClient) -> Callable[..., dict]:
    def make(name: str = "김민준", **fields) -> dict:
        return _ok(client.post("/api/contacts", json={"name": name, **fields}))

    return make


@pytest.fixture
def make_deal(client: TestClient) -> Callable[..., dict]:
    def make(name: str = "2027 포장재 공급", value: int = 10_000, stage: str = "new", **fields) -> dict:
        return _ok(client.post("/api/deals", json={"name": name, "value": value, "stage": stage, **fields}))

    return make


@pytest.fixture
def make_activity(client: TestClient) -> Callable[..., dict]:
    def make(description: str = "통화함", kind: str = "call", **fields) -> dict:
        return _ok(client.post("/api/activities", json={"kind": kind, "description": description, **fields}))

    return make
