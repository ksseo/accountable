"""The four CRM tables, in SQLAlchemy Core (DATA-3 to DATA-7).

They point at each other with foreign keys, so they live together. Deleting an
organization or contact leaves linked records with the link emptied; deleting
a contact or deal deletes the activities logged on it.
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
)

from accountable.core.db import UTCDateTime, metadata, timestamps
from accountable.crm.stages import (
    ACTIVITY_KIND_KEYS,
    CLOSED_STAGE_KEYS,
    OPEN_STAGE_KEYS,
    STAGE_KEYS,
    STATUS_KEYS,
)


def _one_of(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("website", Text),
    Column("industry", String(200)),
    Column("notes", Text),
    *timestamps(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("email", String(320)),
    Column("phone", String(40)),
    Column("job_title", String(200)),
    Column(
        "organization_id",
        Integer,
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    ),
    Column("status", String(20), nullable=False, default="lead"),
    *timestamps(),
    CheckConstraint(_one_of("status", STATUS_KEYS), name="status"),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column(
        "organization_id",
        Integer,
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
    ),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL"), index=True),
    Column("stage", String(20), nullable=False),
    Column("value", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date, index=True),
    Column("position", Float, nullable=False),
    Column("furthest_open_stage", String(20), nullable=False),
    *timestamps(),
    CheckConstraint(_one_of("stage", STAGE_KEYS), name="stage"),
    CheckConstraint(_one_of("furthest_open_stage", OPEN_STAGE_KEYS), name="furthest_open_stage"),
    CheckConstraint("value >= 0 AND value <= 1000000000", name="value"),
    CheckConstraint("probability >= 0 AND probability <= 100", name="probability"),
    CheckConstraint(
        f"NOT ({_one_of('stage', CLOSED_STAGE_KEYS)}) OR close_date IS NOT NULL",
        name="closed_has_close_date",
    ),
    Index(None, "stage", "position"),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("kind", String(20), nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE")),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE")),
    Column("description", Text),
    Column("occurred_at", UTCDateTime, nullable=False),
    Column("follow_up_date", Date),
    Column("follow_up_done", Boolean, nullable=False, default=False),
    Column("from_value", String(20)),
    Column("to_value", String(20)),
    *timestamps(),
    CheckConstraint(_one_of("kind", ACTIVITY_KIND_KEYS), name="kind"),
    CheckConstraint("(contact_id IS NULL) <> (deal_id IS NULL)", name="one_record"),
    Index(None, "contact_id", "occurred_at"),
    Index(None, "deal_id", "occurred_at"),
    Index(None, "occurred_at"),
    Index(None, "follow_up_done", "follow_up_date"),
)
