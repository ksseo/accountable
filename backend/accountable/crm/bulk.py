"""About 1,000 of each kind of record, for the speed tests only (SEED-6).

It isn't part of `npm run seed`. It replaces the data in the database that
ACCOUNTABLE_DB points at with the sample plus generated records.

Run with: uv run python -m accountable.crm.bulk
"""

import random
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import Connection, delete, func, insert, select

from accountable.core import clock
from accountable.core.db import make_engine, migrate, write_connection
from accountable.core.settings import db_path
from accountable.crm import sample
from accountable.crm.deals.rules import POSITION_STEP, usual_probability
from accountable.crm.stages import OPEN_STAGE_KEYS, STATUS_KEYS
from accountable.crm.tables import activities, contacts, deals, organizations

TARGET = 1000
SEED = 1000

ORG_FIRST = ["한강", "새빛", "동방", "태성", "금호", "미래", "청운", "Blue", "North", "Pacific", "Alpine", "Delta", "Summit"]
ORG_SECOND = ["산업", "물산", "정밀", "상사", "테크", "Trading", "Industries", "Supply", "Foods", "Logistics"]
INDUSTRIES = ["제조", "식품", "화장품", "물류", "유통", "의료기기", "IT"]
SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"]
GIVEN = ["민준", "서연", "도윤", "하은", "지호", "수아", "예준", "지유", "시우", "하린"]
DEAL_WORDS = ["포장재", "부품", "금형", "필름", "트레이", "Parts", "Labels", "Boxes", "Liners", "Caps"]
TEXTS = ["통화, 다음 주 견적 요청", "샘플 발송", "Sent quotation", "Discussed delivery dates", "가격 협의"]

WON_SHARE = 0.2
LOST_SHARE = 0.1


def _count(conn: Connection, table) -> int:
    return conn.scalar(select(func.count()).select_from(table))


def add_bulk(conn: Connection) -> None:
    """Adds generated records until there are about 1,000 of each."""
    rng = random.Random(SEED)
    today = clock.today()
    now = clock.now()

    orgs = [
        {
            "name": f"{rng.choice(ORG_FIRST)} {rng.choice(ORG_SECOND)} {index:04d}",
            "industry": rng.choice(INDUSTRIES),
            "website": f"https://bulk-{index:04d}.example",
            "notes": None,
        }
        for index in range(TARGET - _count(conn, organizations))
    ]
    conn.execute(insert(organizations), orgs)
    org_ids = conn.scalars(select(organizations.c.id)).all()

    people = [
        {
            "name": f"{rng.choice(SURNAMES)}{rng.choice(GIVEN)} {index:04d}",
            "email": f"person{index:04d}@bulk.example",
            "phone": f"010-{rng.randint(1000, 9999)}-{index:04d}",
            "job_title": rng.choice(["구매팀장", "Buyer", "대리", "Manager"]),
            "organization_id": rng.choice(org_ids),
            "status": rng.choice(STATUS_KEYS),
        }
        for index in range(TARGET - _count(conn, contacts))
    ]
    conn.execute(insert(contacts), people)
    contact_ids = conn.scalars(select(contacts.c.id)).all()

    positions = {
        stage: conn.scalar(select(func.max(deals.c.position)).where(deals.c.stage == stage)) or 0.0
        for stage in (*OPEN_STAGE_KEYS, "won", "lost")
    }
    rows = []
    for index in range(TARGET - _count(conn, deals)):
        roll = rng.random()
        if roll < WON_SHARE:
            stage, close = "won", today - timedelta(days=rng.randint(0, 360))
        elif roll < WON_SHARE + LOST_SHARE:
            stage, close = "lost", today - timedelta(days=rng.randint(0, 360))
        else:
            stage = OPEN_STAGE_KEYS[index % len(OPEN_STAGE_KEYS)]
            close = today + timedelta(days=rng.randint(-20, 180))
        positions[stage] += POSITION_STEP
        rows.append(
            {
                "name": f"{rng.choice(DEAL_WORDS)} {rng.choice(DEAL_WORDS)} {index:04d}",
                "organization_id": rng.choice(org_ids),
                "contact_id": rng.choice(contact_ids),
                "stage": stage,
                "value": rng.randint(20, 2500) * 100,
                "probability": usual_probability(stage),
                "close_date": close,
                "position": positions[stage],
                "furthest_open_stage": stage if stage in OPEN_STAGE_KEYS else rng.choice(OPEN_STAGE_KEYS),
            }
        )
    conn.execute(insert(deals), rows)
    deal_ids = conn.scalars(select(deals.c.id)).all()

    entries = []
    for _ in range(TARGET - _count(conn, activities)):
        on_deal = rng.random() < 0.5
        follow_up = today + timedelta(days=rng.randint(-10, 40)) if rng.random() < 0.05 else None
        when: datetime = now - timedelta(days=rng.randint(0, 300), minutes=rng.randint(1, 600))
        entries.append(
            {
                "kind": rng.choice(["note", "call", "email"]),
                "deal_id": rng.choice(deal_ids) if on_deal else None,
                "contact_id": None if on_deal else rng.choice(contact_ids),
                "description": rng.choice(TEXTS),
                "occurred_at": when.astimezone(UTC),
                "follow_up_date": follow_up,
                "follow_up_done": False,
            }
        )
    conn.execute(insert(activities), entries)


def load(conn: Connection) -> None:
    """Replaces the CRM data with the sample plus generated records."""
    for table in (activities, deals, contacts, organizations):
        conn.execute(delete(table))
    sample.load(conn)
    add_bulk(conn)


def main() -> int:
    engine = make_engine(db_path())
    try:
        migrate(engine)
        with write_connection(engine) as conn, conn.begin():
            load(conn)
    finally:
        engine.dispose()
    print(f"Loaded about {TARGET} of each record into {db_path()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
