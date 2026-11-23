"""Alembic's environment: one migration history for the whole app.

Each area's tables are imported here so they join the shared MetaData.
"""

from alembic import context

import accountable.crm.tables  # noqa: F401  (the CRM area's tables)
from accountable.core.db import make_engine, metadata, write_connection
from accountable.core.settings import db_path

target_metadata = metadata


def _run(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = context.config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return
    # Run from the alembic command line: use the configured database file.
    engine = make_engine(db_path())
    with write_connection(engine) as conn, conn.begin():
        _run(conn)
    engine.dispose()


if context.is_offline_mode():
    raise SystemExit("Offline migrations aren't supported; run them against the database.")
run_migrations_online()
