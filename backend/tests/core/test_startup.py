"""Starting the app: migrations, the sample on first start, kept data, the clock and the guard."""

import sqlite3
from datetime import UTC, date, datetime

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import func, inspect, insert, select

import accountable.crm.tables  # noqa: F401
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


def test_timestamps_come_back_with_a_time_zone(engine):
    with engine.begin() as conn:
        conn.execute(insert(organizations).values(name="시간 확인"))
        created_at = conn.scalar(select(organizations.c.created_at))
    assert created_at.tzinfo is not None
    assert created_at.utcoffset().total_seconds() == 0
    assert abs((datetime.now(UTC) - created_at).total_seconds()) < 60 * 60 * 24


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
