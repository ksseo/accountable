"""Organizations' request and response shapes (DATA-3, API-2)."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from accountable.crm.fields import LongText, Name, ShortText, Website
from accountable.crm.stages import StageKey, StatusKey


class OrganizationIn(BaseModel):
    name: Name
    website: Website = None
    industry: ShortText = None
    notes: LongText = None


class OrganizationPatch(BaseModel):
    """Only the fields sent are changed. A name can't be emptied."""

    name: Name = Field(default=None)
    website: Website = None
    industry: ShortText = None
    notes: LongText = None


class Organization(BaseModel):
    id: int
    name: str
    website: str | None
    industry: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class OrganizationRow(Organization):
    """A row of the organizations table: with its contact count and open pipeline."""

    contact_count: int
    open_deal_count: int
    open_deal_value: int


class OrganizationContact(BaseModel):
    id: int
    name: str
    job_title: str | None
    status: StatusKey
    email: str | None
    phone: str | None


class OrganizationDeal(BaseModel):
    id: int
    name: str
    stage: StageKey
    value: int
    probability: int
    expected_revenue: int
    close_date: date | None
    is_late: bool
    days_late: int
    contact_id: int | None
    contact_name: str | None


class OrganizationDetail(Organization):
    contacts: list[OrganizationContact]
    deals: list[OrganizationDeal]
    open_deal_count: int
    open_deal_value: int
    won_value: int


class OrganizationImpact(BaseModel):
    """What deleting it leaves behind: these keep existing without the link."""

    contacts: int
    deals: int
