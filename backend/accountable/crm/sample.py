"""Loads the CRM sample data (SEED-1 to SEED-5).

The data is the same every time apart from its dates, which are set from
today. Activities without follow-ups come from templates with a fixed random
seed. No timestamp is in the future.
"""

import random
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import Connection, insert

from accountable.core import clock
from accountable.crm import sample_data as data
from accountable.crm.deals.rules import POSITION_STEP, usual_probability
from accountable.crm.stages import CLOSED_STAGE_KEYS, OPEN_STAGE_KEYS, StageKey
from accountable.crm.tables import activities, contacts, deals, organizations

WORKDAY_START = 9 * 60
WORKDAY_END = 18 * 60


def has_hangul(text: str) -> bool:
    return any("가" <= char <= "힣" for char in text)


def stage_path(deal: data.Deal) -> list[StageKey]:
    """The stages a deal went through, from the one it was added at."""
    if deal.stage in OPEN_STAGE_KEYS:
        furthest = deal.stage
    else:
        furthest = deal.furthest or "negotiation"
    opens = list(OPEN_STAGE_KEYS[OPEN_STAGE_KEYS.index(deal.start) : OPEN_STAGE_KEYS.index(furthest) + 1])
    return opens + ([deal.stage] if deal.stage in CLOSED_STAGE_KEYS else [])


class _Loader:
    def __init__(self, conn: Connection) -> None:
        self.conn = conn
        self.today: date = clock.today()
        self.now: datetime = clock.now()
        self.rng = random.Random(data.RANDOM_SEED)
        self.org_ids: dict[str, int] = {}
        self.contact_ids: dict[str, int] = {}
        self.deal_ids: dict[str, int] = {}
        self.won_at: dict[str, datetime] = {}
        self.entries: list[dict] = []

    def at(self, days: int, minute: int) -> datetime:
        """`minute` past midnight, `days` from today, local time; never after now."""
        local = datetime.combine(self.today + timedelta(days=days), time()) + timedelta(minutes=minute)
        moment = local.astimezone(UTC)
        return min(moment, self.now - timedelta(minutes=1 + minute % 30))

    def work_minute(self) -> int:
        return self.rng.randint(WORKDAY_START, WORKDAY_END)

    def entry(self, **values) -> None:
        row = {
            "kind": None,
            "contact_id": None,
            "deal_id": None,
            "description": None,
            "occurred_at": None,
            "follow_up_date": None,
            "follow_up_done": False,
            "from_value": None,
            "to_value": None,
        }
        row.update(values)
        row["created_at"] = row["updated_at"] = row["occurred_at"]
        self.entries.append(row)

    def load(self) -> None:
        self.load_organizations()
        self.load_contacts()
        self.load_deals()
        self.load_status_entries()
        self.load_logged_activities()
        self.entries.sort(key=lambda row: row["occurred_at"])
        self.conn.execute(insert(activities), self.entries)

    def load_organizations(self) -> None:
        for index, org in enumerate(data.ORGANIZATIONS):
            created = self.at(-420 + index, 540)
            self.org_ids[org.name] = self.conn.execute(
                insert(organizations)
                .values(
                    name=org.name,
                    website=f"https://{org.website}",
                    industry=org.industry,
                    notes=org.notes,
                    created_at=created,
                    updated_at=created,
                )
                .returning(organizations.c.id)
            ).scalar_one()

    def load_contacts(self) -> None:
        for index, person in enumerate(data.CONTACTS):
            created = self.at(-400 + index, 600)
            self.contact_ids[person.name] = self.conn.execute(
                insert(contacts)
                .values(
                    name=person.name,
                    email=person.email,
                    phone=person.phone,
                    job_title=person.job_title,
                    organization_id=self.org_ids[person.org] if person.org else None,
                    status=person.status,
                    created_at=created,
                    updated_at=created,
                )
                .returning(contacts.c.id)
            ).scalar_one()

    def load_deals(self) -> None:
        next_position: dict[str, float] = {}
        for deal in data.DEALS:
            path = stage_path(deal)
            steps = len(path) - 1
            # The last step happens on the close date for a closed deal,
            # and sometime in the last few weeks for an open one.
            last_day = deal.close if deal.stage in CLOSED_STAGE_KEYS else -self.rng.randint(2, 40)
            assert last_day is not None
            days = [last_day]
            for _ in range(steps - 1):
                days.insert(0, days[0] - self.rng.randint(6, 20))
            moments = [self.at(day, self.work_minute()) for day in days] if steps else []
            created = self.at((days[0] if steps else last_day) - self.rng.randint(3, 15), self.work_minute())

            position = next_position.get(deal.stage, POSITION_STEP)
            next_position[deal.stage] = position + POSITION_STEP
            deal_id = self.conn.execute(
                insert(deals)
                .values(
                    name=deal.name,
                    organization_id=self.org_ids[deal.org] if deal.org else None,
                    contact_id=self.contact_ids[deal.contact] if deal.contact else None,
                    stage=deal.stage,
                    value=deal.value,
                    probability=usual_probability(deal.stage),
                    close_date=None if deal.close is None else self.today + timedelta(days=deal.close),
                    position=position,
                    furthest_open_stage=[s for s in path if s in OPEN_STAGE_KEYS][-1],
                    created_at=created,
                    updated_at=moments[-1] if moments else created,
                )
                .returning(deals.c.id)
            ).scalar_one()
            self.deal_ids[deal.name] = deal_id

            for step, moment in enumerate(moments):
                self.entry(
                    kind="stage_change",
                    deal_id=deal_id,
                    from_value=path[step],
                    to_value=path[step + 1],
                    occurred_at=moment,
                )
            if deal.stage == "won":
                self.won_at[deal.name] = moments[-1]

    def load_status_entries(self) -> None:
        """Every customer has a status entry. Won deals' contacts became
        customers when their first deal was won; the rest were changed by hand."""
        first_win: dict[str, data.Deal] = {}
        for deal in data.DEALS:
            if deal.stage == "won" and deal.contact:
                earlier = first_win.get(deal.contact)
                if earlier is None or self.won_at[deal.name] < self.won_at[earlier.name]:
                    first_win[deal.contact] = deal
        for person in data.CONTACTS:
            if person.status != "customer":
                continue
            won = first_win.get(person.name)
            self.entry(
                kind="status_change",
                contact_id=self.contact_ids[person.name],
                from_value="qualified",
                to_value="customer",
                description=won.name if won else None,
                occurred_at=self.won_at[won.name]
                if won
                else self.at(-self.rng.randint(60, 200), self.work_minute()),
            )

    def load_logged_activities(self) -> None:
        org_of = {person.name: person.org for person in data.CONTACTS}
        for item in data.FOLLOW_UPS:
            self.entry(
                kind=item.kind,
                deal_id=self.deal_ids[item.on_deal] if item.on_deal else None,
                contact_id=self.contact_ids[item.on_contact] if item.on_contact else None,
                description=item.description,
                occurred_at=self.at(-item.days_ago, self.work_minute()),
                follow_up_date=None
                if item.follow_up is None
                else self.today + timedelta(days=item.follow_up),
                follow_up_done=item.done,
            )

        targets = [*data.DEALS, *data.CONTACTS]
        for _ in range(data.RANDOM_ACTIVITIES):
            record = self.rng.choice(targets)
            if isinstance(record, data.Deal):
                korean = has_hangul(record.org or record.name)
                if record.stage in CLOSED_STAGE_KEYS:
                    assert record.close is not None
                    days = record.close - self.rng.randint(3, 40)
                else:
                    days = -self.rng.randint(1, 120)
                link = {"deal_id": self.deal_ids[record.name]}
            else:
                korean = has_hangul(org_of[record.name] or record.name)
                days = -self.rng.randint(1, 120)
                link = {"contact_id": self.contact_ids[record.name]}
            kind, text = self.rng.choice(data.TEMPLATES_KO if korean else data.TEMPLATES_EN)
            self.entry(kind=kind, description=text, occurred_at=self.at(days, self.work_minute()), **link)


def load(conn: Connection) -> None:
    _Loader(conn).load()
