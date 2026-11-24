"""GET /api/dashboard's shape: everything in spec 4.2 in one call (API-7, DASH-1)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from accountable.crm.stages import ActivityKind, LoggedKind, OpenStageKey

FunnelStageKey = Literal["new", "qualified", "proposal", "negotiation", "won"]


class Figures(BaseModel):
    """The four figures (DASH-3 to DASH-6) and the header's summary counts (DASH-2)."""

    open_value: int
    open_count: int
    expected_revenue: int
    won_this_month_value: int
    won_this_month_count: int
    won_last_month_value: int
    won_last_month_count: int
    late_count: int
    late_value: int
    overdue_follow_up_count: int
    due_today_follow_up_count: int


class BandStage(BaseModel):
    """One block of the pipeline band (DASH-9)."""

    stage: OpenStageKey
    count: int
    value: int
    expected_revenue: int


class MonthFigures(BaseModel):
    """One month of both charts (DASH-7, DASH-8), as YYYY-MM."""

    month: str
    won_value: int
    won_count: int
    lost_count: int


class FunnelStage(BaseModel):
    """Value and deals that reached a stage, and the value's share of New's (DASH-10)."""

    stage: FunnelStageKey
    value: int
    count: int
    share: float


class RecordRef(BaseModel):
    """The contact or deal an activity is on."""

    kind: Literal["contact", "deal"]
    id: int
    name: str
    organization_id: int | None
    organization_name: str | None


class FollowUp(BaseModel):
    id: int
    kind: LoggedKind
    description: str
    follow_up_date: date
    state: Literal["overdue", "today", "upcoming"]
    days_overdue: int
    record: RecordRef


class RecentEntry(BaseModel):
    id: int
    kind: ActivityKind
    automatic: bool
    description: str | None
    occurred_at: datetime
    from_value: str | None
    to_value: str | None
    record: RecordRef


class Dashboard(BaseModel):
    today: date
    figures: Figures
    band: list[BandStage]
    months: list[MonthFigures]
    funnel: list[FunnelStage]
    conversion: float
    follow_ups: list[FollowUp]
    follow_ups_later: int
    recent: list[RecentEntry]
