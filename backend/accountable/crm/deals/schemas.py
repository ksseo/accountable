"""Deals' request and response shapes (DATA-5, API-4)."""

from datetime import date, datetime

from pydantic import BaseModel

from accountable.crm.fields import Money, Name, Probability, omittable
from accountable.crm.stages import OpenStageKey, StageKey


class DealIn(BaseModel):
    name: Name
    organization_id: int | None = None
    contact_id: int | None = None
    stage: StageKey = "new"
    value: Money
    probability: Probability | None = None
    close_date: date | None = None


class DealPatch(BaseModel):
    """Only the fields sent are changed. A field sent counts as set by hand
    in this save, so a probability or close date sent with a new stage is kept
    (RULE-3). Name, stage and value can't be emptied."""

    name: Name = omittable()
    organization_id: int | None = None
    contact_id: int | None = None
    stage: StageKey = omittable()
    value: Money = omittable()
    probability: Probability | None = None
    close_date: date | None = None


class Deal(BaseModel):
    id: int
    name: str
    organization_id: int | None
    organization_name: str | None
    contact_id: int | None
    contact_name: str | None
    stage: StageKey
    value: int
    probability: int
    expected_revenue: int
    close_date: date | None
    is_late: bool
    days_late: int
    position: float
    furthest_open_stage: OpenStageKey
    created_at: datetime
    updated_at: datetime


class PromotedContact(BaseModel):
    id: int
    name: str


class DealSaved(Deal):
    """The saved deal, and the main contact if the save made them a customer (RULE-7)."""

    promoted_contact: PromotedContact | None = None


class DealImpact(BaseModel):
    """Activities logged on the deal, stage changes included, are deleted with it."""

    activities: int
