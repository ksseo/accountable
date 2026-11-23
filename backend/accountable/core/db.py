"""The database: table definitions, engine, transactions and migrations.

Everything specific to SQLite lives here, so moving to Postgres later changes
this file and the migrations, and not the features (DATA-1, DATA-2).
"""

from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from alembic import command
from alembic.config import Config
from fastapi import Depends, Request
from sqlalchemy import Column, Connection, DateTime, Engine, MetaData, create_engine, event
from sqlalchemy.types import TypeDecorator

from accountable.core import clock

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"

# Every area's tables join this one MetaData. The naming convention gives
# constraints stable names, so migrations can refer to them.
metadata = MetaData(
    naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_N_name)s",
        "uq": "uq_%(table_name)s_%(column_0_N_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)


class UTCDateTime(TypeDecorator):
    """A timestamp stored in UTC that always comes back time-zone aware.

    SQLite has no time zone type, so the value is stored as naive UTC.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Timestamps must be time-zone aware")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC)


def timestamps() -> list[Column]:
    """created_at and updated_at, filled in from the clock."""
    return [
        Column("created_at", UTCDateTime, nullable=False, default=clock.now),
        Column("updated_at", UTCDateTime, nullable=False, default=clock.now, onupdate=clock.now),
    ]


BUSY_TIMEOUT_MS = 15_000


def make_engine(path: Path) -> Engine:
    """An engine for the SQLite file at path, creating its folder if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{path.as_posix()}",
        connect_args={"check_same_thread": False, "timeout": BUSY_TIMEOUT_MS / 1000},
    )

    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_connection, _record) -> None:
        # Take over transaction handling from Python's sqlite3, so BEGIN is ours.
        dbapi_connection.isolation_level = None
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute(f"PRAGMA busy_timeout = {BUSY_TIMEOUT_MS}")
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.close()

    @event.listens_for(engine, "begin")
    def _on_begin(conn: Connection) -> None:
        # A write takes the write lock at the start, so it waits for another
        # writer (such as a seed run) instead of failing halfway through.
        mode = "IMMEDIATE" if conn.get_execution_options().get("write") else "DEFERRED"
        conn.exec_driver_sql(f"BEGIN {mode}")

    return engine


def write_connection(engine: Engine) -> Connection:
    """A connection whose transactions take the write lock at once."""
    conn = engine.connect()
    conn.execution_options(write=True)
    return conn


def _request_connection(request: Request) -> Iterator[Connection]:
    """One transaction per request, committed before the response is sent."""
    engine: Engine = request.app.state.engine
    with engine.connect() as conn:
        conn.execution_options(write=request.method not in ("GET", "HEAD"))
        with conn.begin():
            yield conn


Conn = Annotated[Connection, Depends(_request_connection, scope="function")]


def migrate(engine: Engine) -> None:
    """Bring the database up to date with the Alembic migrations."""
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    with write_connection(engine) as conn, conn.begin():
        config.attributes["connection"] = conn
        command.upgrade(config, "head")
