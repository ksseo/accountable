"""The board: which deals it shows, then GET /api/pipeline and POST /api/deals/{id}/move
(API-6, RULE-14, PIPE-3, PIPE-4)."""

from datetime import date, timedelta

from accountable.crm.pipeline.rules import shows_on_board

TODAY = date(2026, 11, 23)


def test_open_columns_show_every_deal():
    assert shows_on_board("new", None, TODAY)
    assert shows_on_board("negotiation", TODAY - timedelta(days=400), TODAY)


def test_won_and_lost_show_the_last_30_days_by_close_date():
    for stage in ("won", "lost"):
        assert shows_on_board(stage, TODAY, TODAY)
        assert shows_on_board(stage, TODAY - timedelta(days=30), TODAY)
        assert not shows_on_board(stage, TODAY - timedelta(days=31), TODAY)


def _days_ago(days: int) -> str:
    return (TODAY - timedelta(days=days)).isoformat()


def _columns(client) -> dict:
    return {column["stage"]: column for column in client.get("/api/pipeline").json()["columns"]}


def test_six_columns_in_stage_order_with_open_only_totals(client, make_deal):
    make_deal("A", value=10_000, stage="new")
    make_deal("B", value=20_000, stage="proposal")
    make_deal("C", value=40_000, stage="negotiation")
    make_deal("D", value=80_000, stage="won")
    make_deal("E", value=160_000, stage="lost")
    board = client.get("/api/pipeline").json()
    assert [column["stage"] for column in board["columns"]] == [
        "new",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
    ]
    columns = {column["stage"]: column for column in board["columns"]}
    assert (
        columns["proposal"]["count"],
        columns["proposal"]["value"],
        columns["proposal"]["expected_revenue"],
    ) == (1, 20_000, 10_000)
    assert (columns["qualified"]["count"], columns["qualified"]["value"]) == (0, 0)
    assert (columns["won"]["count"], columns["won"]["value"]) == (1, 80_000)
    assert (board["open_count"], board["open_value"], board["open_expected_revenue"]) == (3, 70_000, 41_000)
    assert board["window_start"] == _days_ago(30)


def test_won_and_lost_by_close_date_30_days_in_31_out(client, make_deal):
    for stage in ("won", "lost"):
        make_deal(f"{stage} 30", stage=stage, close_date=_days_ago(30))
        make_deal(f"{stage} 31", stage=stage, close_date=_days_ago(31))
    make_deal("오래된 진행 중", stage="qualified", close_date=_days_ago(400))
    columns = _columns(client)
    assert [deal["name"] for deal in columns["won"]["deals"]] == ["won 30"]
    assert [deal["name"] for deal in columns["lost"]["deals"]] == ["lost 30"]
    assert [deal["name"] for deal in columns["qualified"]["deals"]] == ["오래된 진행 중"]


def test_cards_are_in_place_order_and_a_new_deal_goes_to_the_top(client, make_deal):
    for name in ("first", "second", "third"):
        make_deal(name, stage="proposal")
    assert [deal["name"] for deal in _columns(client)["proposal"]["deals"]] == ["third", "second", "first"]


def test_a_move_changes_stage_and_place(client, make_deal):
    below = make_deal("below", stage="proposal")
    above = make_deal("above", stage="proposal")
    moving = make_deal("moving", stage="new")
    saved = client.post(
        f"/api/deals/{moving['id']}/move",
        json={"stage": "proposal", "after_id": above["id"], "before_id": below["id"]},
    )
    assert saved.status_code == 200
    card = saved.json()
    assert (card["stage"], card["probability"], card["furthest_open_stage"]) == ("proposal", 50, "proposal")
    assert above["position"] < card["position"] < below["position"]
    assert [deal["name"] for deal in _columns(client)["proposal"]["deals"]] == ["above", "moving", "below"]
    timeline = client.get(f"/api/deals/{moving['id']}/timeline").json()["items"]
    assert [(i["from_value"], i["to_value"]) for i in timeline] == [("new", "proposal")]


def test_a_move_within_a_column_adds_no_entry(client, make_deal):
    bottom = make_deal("bottom", stage="new")
    make_deal("top", stage="new")
    client.post(f"/api/deals/{bottom['id']}/move", json={"stage": "new"})
    assert [deal["name"] for deal in _columns(client)["new"]["deals"]] == ["bottom", "top"]
    assert client.get(f"/api/deals/{bottom['id']}/timeline").json()["total"] == 0


def test_a_move_to_won_makes_a_customer(client, make_contact, make_deal):
    contact = make_contact()
    deal = make_deal(stage="negotiation", contact_id=contact["id"])
    card = client.post(f"/api/deals/{deal['id']}/move", json={"stage": "won"}).json()
    assert (card["close_date"], card["probability"]) == (TODAY.isoformat(), 100)
    assert card["promoted_contact"] == {"id": contact["id"], "name": "김민준"}
    assert client.get(f"/api/contacts/{contact['id']}").json()["status"] == "customer"


def test_a_wrong_move_is_refused(client, make_deal):
    deal = make_deal(stage="new")
    elsewhere = make_deal("elsewhere", stage="proposal")
    response = client.post(
        f"/api/deals/{deal['id']}/move", json={"stage": "new", "after_id": elsewhere["id"]}
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "after_id"
    assert client.post(f"/api/deals/{deal['id']}/move", json={"stage": "closed"}).status_code == 422
    assert client.post("/api/deals/999/move", json={"stage": "new"}).status_code == 404
