"""npm run seed: put the sample data back (APP-6).

It asks first, unless given --yes. It wipes every table and loads each area's
sample data in one transaction, so the running app never sees half a reset.

Run with: uv run python -m accountable.seed [--yes]
"""

import argparse
import io
import sys
from collections.abc import Callable

from sqlalchemy import Connection, Engine, delete

from accountable.core.db import make_engine, metadata, migrate, write_connection
from accountable.core.settings import db_path
from accountable.crm import sample as crm_sample

QUESTION = "모든 데이터를 지우고 샘플 데이터로 되돌릴까요? (y/N) "

# Each area's sample loader, in the order they depend on each other.
SAMPLE_LOADERS = [crm_sample.load]


def load_samples(conn: Connection) -> None:
    """Load every area's sample data into empty tables."""
    for load in SAMPLE_LOADERS:
        load(conn)


def reset(engine: Engine) -> None:
    """Wipe every table and load the sample data, in one transaction."""
    with write_connection(engine) as conn, conn.begin():
        for table in reversed(metadata.sorted_tables):
            conn.execute(delete(table))
        load_samples(conn)


def main(argv: list[str] | None = None, ask: Callable[[str], str] = input) -> int:
    parser = argparse.ArgumentParser(description="Reset the database to the sample data.")
    parser.add_argument("--yes", action="store_true", help="don't ask first")
    args = parser.parse_args(argv)

    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")

    if not args.yes:
        try:
            answer = ask(QUESTION)
        except EOFError:
            answer = ""
        if answer.strip().lower() != "y":
            print("아무것도 바꾸지 않았어요.")
            return 0

    path = db_path()
    engine = make_engine(path)
    try:
        migrate(engine)
        reset(engine)
    finally:
        engine.dispose()
    print(f"샘플 데이터로 되돌렸어요. ({path})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
