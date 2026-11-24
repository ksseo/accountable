"""With about 1,000 of each record, the dashboard and the board answer within
300 ms, and their queries read through indexes (PERF-4)."""

import re
import time
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from accountable.core.db import make_engine, migrate, write_connection
from accountable.crm import bulk
from accountable.main import create_app

LIMIT_MS = 300
CALLS = 5

# A full read of a table, rather than a search through an index or the key.
FULL_SCAN = re.compile(r"^SCAN (\w+)$")


@pytest.fixture(scope="module")
def bulk_client(tmp_path_factory: pytest.TempPathFactory) -> Iterator[TestClient]:
    """One bulk database for the whole module: loading it takes a few seconds."""
    path = tmp_path_factory.mktemp("bulk") / "accountable.db"
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("ACCOUNTABLE_DB", str(path))
        patch.setenv("ACCOUNTABLE_TODAY", "2026-11-23")
        engine = make_engine(path)
        migrate(engine)
        with write_connection(engine) as conn, conn.begin():
            bulk.load(conn)
        engine.dispose()
        with TestClient(create_app(), base_url="http://127.0.0.1") as client:
            yield client


def _slowest_ms(client: TestClient, path: str) -> float:
    assert client.get(path).status_code == 200  # the first call warms SQLite's cache
    slowest = 0.0
    for _ in range(CALLS):
        start = time.perf_counter()
        response = client.get(path)
        slowest = max(slowest, (time.perf_counter() - start) * 1000)
        assert response.status_code == 200
    return slowest


def _plans(client: TestClient, path: str) -> list[tuple[str, list[str]]]:
    """Each query the request runs, with SQLite's plan for it."""
    engine = client.app.state.engine
    statements: list[tuple[str, tuple]] = []

    def grab(conn, cursor, statement, params, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append((statement, params))

    event.listen(engine, "before_cursor_execute", grab)
    try:
        assert client.get(path).status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", grab)
    raw = engine.raw_connection()
    try:
        return [
            (statement, [row[3] for row in raw.execute(f"EXPLAIN QUERY PLAN {statement}", params).fetchall()])
            for statement, params in statements
        ]
    finally:
        raw.close()


def test_the_bulk_data_is_loaded(bulk_client):
    board = bulk_client.get("/api/pipeline").json()
    assert board["open_count"] > 500


@pytest.mark.parametrize("path", ["/api/dashboard", "/api/pipeline"])
def test_answers_within_300_ms(bulk_client, path):
    slowest = _slowest_ms(bulk_client, path)
    assert slowest < LIMIT_MS, f"{path} took {slowest:.0f} ms"


@pytest.mark.parametrize("path", ["/api/dashboard", "/api/pipeline"])
def test_no_query_reads_a_whole_table(bulk_client, path):
    plans = _plans(bulk_client, path)
    assert plans
    for statement, plan in plans:
        scans = [line for line in plan if FULL_SCAN.match(line)]
        assert not scans, f"{scans} in {' '.join(statement.split())[:120]}"


def test_the_dashboard_uses_the_activity_and_deal_indexes(bulk_client):
    lines = [line for _, plan in _plans(bulk_client, "/api/dashboard") for line in plan]
    assert any("ix_activities_follow_up_done_follow_up_date" in line for line in lines)
    assert any("ix_activities_occurred_at" in line for line in lines)
    assert any("ix_deals_stage_position" in line for line in lines)
    assert any("ix_deals_close_date" in line for line in lines)


def test_the_board_uses_the_stage_index(bulk_client):
    lines = [line for _, plan in _plans(bulk_client, "/api/pipeline") for line in plan]
    assert any("ix_deals_stage_position" in line for line in lines)
