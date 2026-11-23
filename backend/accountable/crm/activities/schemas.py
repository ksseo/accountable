"""Activities' request and response shapes (DATA-6, API-5, REC-4)."""

from datetime import date, datetime

from pydantic import AwareDatetime, BaseModel, Field

from accountable.crm.activities.rules import FollowUpState
from accountable.crm.fields import Description
from accountable.crm.stages import ActivityKind, LoggedKind


class ActivityIn(BaseModel):
    """A note, call or email, logged on exactly one contact or deal."""

    kind: LoggedKind
    contact_id: int | None = None
    deal_id: int | None = None
    description: Description
    occurred_at: AwareDatetime | None = None
    follow_up_date: date | None = None


class ActivityPatch(BaseModel):
    kind: LoggedKind = Field(default=None)
    description: Description = Field(default=None)
    occurred_at: AwareDatetime = Field(default=None)
    follow_up_date: date | None = None
    follow_up_done: bool = Field(default=None)


class TimelineEntry(BaseModel):
    id: int
    kind: ActivityKind
    automatic: bool
    description: str | None
    occurred_at: datetime
    follow_up_date: date | None
    follow_up_done: bool
    follow_up_state: FollowUpState | None
    from_value: str | None
    to_value: str | None
    contact_id: int | None
    contact_name: str | None
    deal_id: int | None
    deal_name: str | None


class TimelinePage(BaseModel):
    """Newest first, 50 at a time."""

    items: list[TimelineEntry]
    total: int
    offset: int
    limit: int
