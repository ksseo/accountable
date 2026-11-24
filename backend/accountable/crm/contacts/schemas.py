"""Contacts' request and response shapes (DATA-4, API-3)."""

from datetime import date, datetime

from pydantic import BaseModel

from accountable.crm.fields import Email, Name, Phone, ShortText, omittable
from accountable.crm.stages import StageKey, StatusKey


class ContactIn(BaseModel):
    name: Name
    email: Email = None
    phone: Phone = None
    job_title: ShortText = None
    organization_id: int | None = None
    status: StatusKey = "lead"


class ContactPatch(BaseModel):
    """Only the fields sent are changed. A name and status can't be emptied."""

    name: Name = omittable()
    email: Email = None
    phone: Phone = None
    job_title: ShortText = None
    organization_id: int | None = None
    status: StatusKey = omittable()


class Contact(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    job_title: str | None
    organization_id: int | None
    organization_name: str | None
    status: StatusKey
    created_at: datetime
    updated_at: datetime


class ContactDeal(BaseModel):
    """A deal where the contact is the main contact."""

    id: int
    name: str
    stage: StageKey
    value: int
    probability: int
    expected_revenue: int
    close_date: date | None
    is_late: bool
    days_late: int
    organization_id: int | None
    organization_name: str | None


class ContactDetail(Contact):
    deals: list[ContactDeal]


class ContactImpact(BaseModel):
    """Deals keep existing without a main contact; activities are deleted."""

    deals: int
    activities: int
