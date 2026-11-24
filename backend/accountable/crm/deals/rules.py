"""Deal rules as plain functions (RULE-3 to RULE-5).

Expected revenue and lateness are in crm/figures.py, since every feature that
lists deals needs them.
"""

from collections.abc import Mapping
from datetime import date
from typing import Any

from accountable.crm.stages import CLOSED_STAGE_KEYS, STAGE_BY_KEY, StageKey, is_open, open_stage_index

# A card's place in its column. A new column starts at 1024 and steps by 1024,
# and the top of a column is the smallest number minus 1024 (PIPE-6).
POSITION_STEP = 1024.0


def usual_probability(stage: StageKey) -> int:
    return STAGE_BY_KEY[stage].probability


def initial_furthest_stage(stage: str) -> str:
    """A new deal has reached its own stage; one created closed counts from New."""
    return stage if is_open(stage) else "new"


def further_open_stage(current: str, new_stage: str) -> str:
    """furthest_open_stage only moves forward, and only to an open stage."""
    if is_open(new_stage) and open_stage_index(new_stage) > open_stage_index(current):
        return new_stage
    return current


def stage_change_fields(
    current: Mapping[str, Any], new_stage: StageKey, given: Mapping[str, Any], today: date
) -> dict:
    """What a change of stage sets, unless the same save sets it by hand (RULE-3, RULE-5).

    - the probability becomes the new stage's usual one;
    - Won or Lost takes today's close date; an open stage keeps the close date;
    - furthest_open_stage moves forward if the new stage is further along.
    """
    fields: dict[str, Any] = {
        "stage": new_stage,
        "furthest_open_stage": further_open_stage(current["furthest_open_stage"], new_stage),
    }
    probability = given.get("probability")
    fields["probability"] = usual_probability(new_stage) if probability is None else probability
    if new_stage in CLOSED_STAGE_KEYS:
        fields["close_date"] = given.get("close_date") or today
    elif "close_date" in given:
        fields["close_date"] = given["close_date"]
    return fields
