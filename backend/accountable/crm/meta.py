"""GET /api/meta: the fixed lists the screens need, and today (API-1)."""

from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.stages import (
    AUTOMATIC_KIND_KEYS,
    LOGGED_KINDS,
    AUTOMATIC_KINDS,
    STAGES,
    STATUSES,
    ActivityKind,
    StageKey,
    StatusKey,
)
from accountable.crm.tables import organizations

router = APIRouter(tags=["meta"])


class StageInfo(BaseModel):
    key: StageKey
    label: str
    probability: int
    open: bool


class StatusInfo(BaseModel):
    key: StatusKey
    label: str


class ActivityKindInfo(BaseModel):
    key: ActivityKind
    label: str
    automatic: bool


class Meta(BaseModel):
    today: date
    stages: list[StageInfo]
    statuses: list[StatusInfo]
    activity_kinds: list[ActivityKindInfo]
    industries: list[str]


@router.get("/meta")
def get_meta(conn: Conn) -> Meta:
    industries = conn.scalars(
        select(organizations.c.industry)
        .where(organizations.c.industry.is_not(None), organizations.c.industry != "")
        .distinct()
    ).all()
    return Meta(
        today=clock.today(),
        stages=[StageInfo(key=s.key, label=s.label, probability=s.probability, open=s.open) for s in STAGES],
        statuses=[StatusInfo(key=k, label=label) for k, label in STATUSES],
        activity_kinds=[
            ActivityKindInfo(key=k, label=label, automatic=k in AUTOMATIC_KIND_KEYS)
            for k, label in LOGGED_KINDS + AUTOMATIC_KINDS
        ],
        industries=sorted(industries),
    )
