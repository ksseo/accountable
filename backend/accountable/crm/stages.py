"""Stages, contact statuses and activity kinds, fixed in code (DATA-8)."""

from dataclasses import dataclass
from typing import Literal

StageKey = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]
OpenStageKey = Literal["new", "qualified", "proposal", "negotiation"]
StatusKey = Literal["lead", "qualified", "customer"]
LoggedKind = Literal["note", "call", "email"]
ActivityKind = Literal["note", "call", "email", "stage_change", "status_change"]


@dataclass(frozen=True)
class Stage:
    key: StageKey
    label: str
    probability: int
    open: bool


STAGES = (
    Stage("new", "신규", 10, True),
    Stage("qualified", "적격", 25, True),
    Stage("proposal", "제안", 50, True),
    Stage("negotiation", "협상", 75, True),
    Stage("won", "수주", 100, False),
    Stage("lost", "실주", 0, False),
)
STAGE_BY_KEY = {s.key: s for s in STAGES}
STAGE_KEYS = tuple(s.key for s in STAGES)
OPEN_STAGE_KEYS = tuple(s.key for s in STAGES if s.open)
CLOSED_STAGE_KEYS = ("won", "lost")

# Contact statuses, lowest first. A status is never lowered automatically.
STATUSES = (("lead", "리드"), ("qualified", "적격"), ("customer", "고객"))
STATUS_KEYS = tuple(key for key, _ in STATUSES)

# Activity kinds. The automatic ones are written only by the app.
LOGGED_KINDS = (("note", "메모"), ("call", "통화"), ("email", "이메일"))
AUTOMATIC_KINDS = (("stage_change", "단계 변경"), ("status_change", "상태 변경"))
LOGGED_KIND_KEYS = tuple(key for key, _ in LOGGED_KINDS)
AUTOMATIC_KIND_KEYS = tuple(key for key, _ in AUTOMATIC_KINDS)
ACTIVITY_KIND_KEYS = LOGGED_KIND_KEYS + AUTOMATIC_KIND_KEYS


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGE_KEYS


def open_stage_index(stage: str) -> int:
    """Where an open stage sits among the open stages, from 0 for new."""
    return OPEN_STAGE_KEYS.index(stage)


def status_rank(status: str) -> int:
    return STATUS_KEYS.index(status)
