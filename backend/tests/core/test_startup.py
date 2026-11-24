"""Starting the app: migrations, the sample on first start, kept data, the clock and the guard."""

import sqlite3
from datetime import UTC, date, datetime

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import func, inspect, insert, select

import accountable.crm.tables  # noqa: F401
from accountable import seed
from accountable.core import clock
from accountable.core.db import make_engine, metadata
from accountable.core.settings import DEFAULT_DB_PATH, db_path
from accountable.crm.tables import contacts, deals, organizations
from accountable.main import create_app


def test_a_new_database_is_migrated_and_loaded_with_the_sample():
    assert not db_path().exists()
    with TestClient(create_app()) as client:
        engine = client.app.state.engine
        assert set(inspect(engine).get_table_names()) >= {
            "organizations",
            "contacts",
            "deals",
            "activities",
            "alembic_version",
        }
        with engine.connect() as conn:
            assert conn.scalar(select(func.count()).select_from(organizations)) > 0
            assert conn.scalar(select(func.count()).select_from(deals)) > 0


def test_an_existing_empty_database_gets_no_sample(client, engine):
    with engine.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(organizations)) == 0


def test_a_second_start_keeps_a_record_added_by_hand():
    with TestClient(create_app()) as client:
        with client.app.state.engine.begin() as conn:
            org_id = conn.execute(
                insert(organizations).values(name="손으로 추가한 거래처")
            ).inserted_primary_key[0]
            count = conn.scalar(select(func.count()).select_from(organizations))

    with TestClient(create_app()) as client:
        with client.app.state.engine.connect() as conn:
            name = conn.scalar(select(organizations.c.name).where(organizations.c.id == org_id))
            # The sample isn't loaded again on top of the data.
            assert conn.scalar(select(func.count()).select_from(organizations)) == count
    assert name == "손으로 추가한 거래처"


def test_a_first_start_cut_short_is_done_again_by_the_next_one(monkeypatch):
    def cut_short(conn):
        conn.execute(insert(organizations).values(name="절반만 들어간 거래처"))
        raise RuntimeError("stopped halfway")

    with monkeypatch.context() as patch:
        patch.setattr(seed, "SAMPLE_LOADERS", [cut_short])
        with pytest.raises(RuntimeError, match="stopped halfway"), TestClient(create_app()):
            pass

    with TestClient(create_app()) as client, client.app.state.engine.connect() as conn:
        names = set(conn.scalars(select(organizations.c.name)))
        assert "한빛정밀" in names
        assert "절반만 들어간 거래처" not in names


@pytest.mark.parametrize("host", ["evil.example", "evil.example:8000", "127.0.0.1.evil.example", ""])
def test_a_request_addressed_to_another_host_is_refused(client, host):
    """Another site can point its own name at 127.0.0.1, so the address alone isn't enough (APP-5)."""
    assert client.get("/api/contacts", headers={"host": host}).status_code == 400
    response = client.post("/api/organizations", headers={"host": host}, json={"name": "다른 사이트가 추가함"})
    assert response.status_code == 400


@pytest.mark.parametrize("host", ["127.0.0.1:8000", "127.0.0.1:5173", "localhost:5173", "127.0.0.1"])
def test_this_computers_own_addresses_are_answered(client, host):
    assert client.get("/api/health", headers={"host": host}).status_code == 200


def test_the_tables_match_the_migrations(empty_db):
    engine = make_engine(empty_db)
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), metadata)
    engine.dispose()
    assert diff == []


def test_foreign_keys_are_on(engine):
    with engine.connect() as conn:
        assert conn.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1


def test_accountable_today_sets_today(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2027-03-01")
    assert clock.today() == date(2027, 3, 1)
    assert clock.now().astimezone().date() == date(2027, 3, 1)
    monkeypatch.delenv("ACCOUNTABLE_TODAY")
    assert clock.today() == datetime.now().astimezone().date()


def test_now_is_time_zone_aware():
    assert clock.now().tzinfo is not None


def test_timestamps_come_back_with_a_time_zone(engine, monkeypatch):
    # With today fixed, created_at is on that day, so it can't be compared with the real clock.
    monkeypatch.delenv("ACCOUNTABLE_TODAY")
    before = datetime.now(UTC)
    with engine.begin() as conn:
        conn.execute(insert(organizations).values(name="시간 확인"))
        created_at = conn.scalar(select(organizations.c.created_at))
    assert created_at.tzinfo is not None
    assert created_at.utcoffset().total_seconds() == 0
    assert before <= created_at <= datetime.now(UTC)


def test_deleting_an_organization_keeps_its_contacts(engine):
    with engine.begin() as conn:
        org_id = conn.execute(insert(organizations).values(name="삭제될 거래처")).inserted_primary_key[0]
        conn.execute(insert(contacts).values(name="남는 사람", organization_id=org_id))
        conn.execute(organizations.delete().where(organizations.c.id == org_id))
        assert conn.scalar(select(contacts.c.organization_id)) is None


def test_the_guard_stops_a_test_that_would_use_the_real_database():
    existed = DEFAULT_DB_PATH.exists()
    with pytest.raises(pytest.exit.Exception):
        sqlite3.connect(str(DEFAULT_DB_PATH))
    assert DEFAULT_DB_PATH.exists() == existed


def test_tests_use_their_own_database():
    assert db_path().resolve() != DEFAULT_DB_PATH.resolve()
