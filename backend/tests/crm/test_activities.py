"""Activities: one record each, follow-ups, fixed automatic entries and timelines
(DATA-6, DATA-7, RULE-9 to RULE-11, API-5)."""

from datetime import date, timedelta

import pytest
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError

from accountable.core import clock
from accountable.crm.activities.rules import add_automatic_entry, follow_up_state, is_automatic
from accountable.crm.tables import activities, contacts, deals

TODAY = date(2026, 11, 23)


@pytest.mark.parametrize(
    ("follow_up", "done", "state"),
    [
        (None, False, None),
        (TODAY - timedelta(days=1), False, "overdue"),
        (TODAY, False, "today"),
        (TODAY + timedelta(days=1), False, "upcoming"),
        (TODAY - timedelta(days=1), True, "done"),
    ],
)
def test_follow_up_states(follow_up, done, state):
    assert follow_up_state(follow_up, done, TODAY) == state


def test_stage_and_status_changes_are_automatic():
    assert is_automatic("stage_change")
    assert is_automatic("status_change")
    assert not any(is_automatic(kind) for kind in ("note", "call", "email"))


def test_only_automatic_kinds_go_through_the_automatic_writer(conn):
    with pytest.raises(ValueError):
        add_automatic_entry(conn, "note", contact_id=1, from_value=None, to_value="x")


def test_the_database_refuses_an_activity_on_both_or_neither_record(conn, add):
    contact_id = add(contacts, name="김민준")
    deal_id = add(deals, name="A")
    for link in ({}, {"contact_id": contact_id, "deal_id": deal_id}):
        with pytest.raises(IntegrityError), conn.begin_nested():
            conn.execute(
                insert(activities).values(kind="note", description="x", occurred_at=clock.now(), **link)
            )


def _ago(**delta) -> str:
    return (clock.now() - timedelta(**delta)).isoformat()


def test_an_activity_is_logged_on_exactly_one_record(client, make_contact, make_deal):
    contact = make_contact()
    deal = make_deal()
    for link in ({}, {"contact_id": contact["id"], "deal_id": deal["id"]}):
        response = client.post("/api/activities", json={"kind": "note", "description": "x", **link})
        assert response.status_code == 422
        assert response.json()["detail"][0]["type"] == "one_record"
    missing = client.post("/api/activities", json={"kind": "note", "description": "x", "deal_id": 999})
    assert missing.status_code == 422
    assert missing.json()["detail"][0]["loc"][-1] == "deal_id"


def test_logged_activities_have_their_fields(make_contact, make_activity):
    contact = make_contact()
    entry = make_activity(" 견적 문의 ", kind="email", contact_id=contact["id"], follow_up_date="2026-11-25")
    assert (entry["kind"], entry["description"], entry["automatic"]) == ("email", "견적 문의", False)
    assert (entry["follow_up_date"], entry["follow_up_state"], entry["follow_up_done"]) == (
        "2026-11-25",
        "upcoming",
        False,
    )
    assert entry["contact_name"] == "김민준"
    assert entry["occurred_at"].endswith("Z") or "+00:00" in entry["occurred_at"]


def test_a_logged_kind_must_be_note_call_or_email(client, make_contact):
    contact = make_contact()
    for kind in ("stage_change", "status_change", "meeting"):
        response = client.post(
            "/api/activities", json={"kind": kind, "description": "x", "contact_id": contact["id"]}
        )
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"][-1] == "kind"


def test_a_future_time_is_refused(client, make_contact, make_activity):
    contact = make_contact()
    tomorrow = (clock.now() + timedelta(days=1)).isoformat()
    response = client.post(
        "/api/activities",
        json={"kind": "call", "description": "x", "contact_id": contact["id"], "occurred_at": tomorrow},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "occurred_at"

    entry = make_activity(contact_id=contact["id"], occurred_at=_ago(hours=2))
    response = client.patch(f"/api/activities/{entry['id']}", json={"occurred_at": tomorrow})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "occurred_at"


def test_a_time_without_a_time_zone_is_refused(client, make_contact):
    contact = make_contact()
    response = client.post(
        "/api/activities",
        json={
            "kind": "call",
            "description": "x",
            "contact_id": contact["id"],
            "occurred_at": "2026-11-20T10:00:00",
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "occurred_at"


def test_logged_activities_can_be_edited_and_deleted(client, make_contact, make_activity):
    contact = make_contact()
    entry = make_activity(contact_id=contact["id"], follow_up_date="2026-11-20")
    assert entry["follow_up_state"] == "overdue"
    edited = client.patch(
        f"/api/activities/{entry['id']}", json={"follow_up_done": True, "description": "통화 완료"}
    )
    assert edited.status_code == 200
    assert (edited.json()["follow_up_state"], edited.json()["description"]) == ("done", "통화 완료")
    cleared = client.patch(f"/api/activities/{entry['id']}", json={"follow_up_date": None})
    assert cleared.json()["follow_up_state"] is None
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 204
    assert client.patch(f"/api/activities/{entry['id']}", json={"description": "x"}).status_code == 404
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 404


def test_automatic_entries_return_409_on_edit_and_delete(client, make_contact, make_deal):
    contact = make_contact()
    deal = make_deal()
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "qualified"})
    client.patch(f"/api/contacts/{contact['id']}", json={"status": "qualified"})
    entries = (
        client.get(f"/api/deals/{deal['id']}/timeline").json()["items"]
        + client.get(f"/api/contacts/{contact['id']}/timeline").json()["items"]
    )
    assert {entry["kind"] for entry in entries} == {"stage_change", "status_change"}
    for entry in entries:
        assert client.patch(f"/api/activities/{entry['id']}", json={"description": "x"}).status_code == 409
        assert client.delete(f"/api/activities/{entry['id']}").status_code == 409


def test_a_contacts_timeline_includes_their_deals_with_the_deal_name(
    client, make_contact, make_deal, make_activity
):
    contact = make_contact()
    deal = make_deal("2027 포장재 공급", contact_id=contact["id"])
    other = make_deal("다른 거래")
    make_activity("본인", contact_id=contact["id"], occurred_at=_ago(hours=3))
    make_activity("거래", deal_id=deal["id"], occurred_at=_ago(hours=2))
    make_activity("남의 거래", deal_id=other["id"], occurred_at=_ago(hours=1))
    items = client.get(f"/api/contacts/{contact['id']}/timeline").json()["items"]
    assert [(i["description"], i["deal_name"]) for i in items] == [
        ("거래", "2027 포장재 공급"),
        ("본인", None),
    ]


def test_a_new_main_contact_takes_the_deals_history(client, make_contact, make_deal, make_activity):
    first = make_contact("김민준")
    second = make_contact("박서연")
    deal = make_deal(contact_id=first["id"])
    make_activity("견적 보냄", deal_id=deal["id"])
    client.patch(f"/api/deals/{deal['id']}", json={"contact_id": second["id"]})
    assert client.get(f"/api/contacts/{first['id']}/timeline").json()["total"] == 0
    assert [
        i["description"] for i in client.get(f"/api/contacts/{second['id']}/timeline").json()["items"]
    ] == ["견적 보냄"]


def test_timelines_are_newest_first_50_at_a_time(client, make_deal, make_activity):
    deal = make_deal()
    for minutes in range(55, 0, -1):
        make_activity(f"{minutes}분 전", deal_id=deal["id"], occurred_at=_ago(minutes=minutes))
    first = client.get(f"/api/deals/{deal['id']}/timeline").json()
    assert (first["total"], first["offset"], first["limit"], len(first["items"])) == (55, 0, 50, 50)
    assert first["items"][0]["description"] == "1분 전"
    assert first["items"][-1]["description"] == "50분 전"
    rest = client.get(f"/api/deals/{deal['id']}/timeline?offset=50").json()
    assert [i["description"] for i in rest["items"]] == [
        "51분 전",
        "52분 전",
        "53분 전",
        "54분 전",
        "55분 전",
    ]
