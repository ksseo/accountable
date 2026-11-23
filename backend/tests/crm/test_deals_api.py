"""Deals' API (API-4, DATA-5, RULE-3, DEL-2)."""

DEAL_FIELDS = {
    "id", "name", "organization_id", "organization_name", "contact_id", "contact_name", "stage", "value",
    "probability", "expected_revenue", "close_date", "is_late", "days_late", "position", "furthest_open_stage",
    "created_at", "updated_at",
}


def test_add_read_edit_delete(client, make_org, make_contact, make_deal):
    org = make_org()
    contact = make_contact(organization_id=org["id"])
    created = make_deal(
        "2027 포장재 공급", value=120_000, stage="proposal", organization_id=org["id"], contact_id=contact["id"],
        close_date="2026-12-30",
    )
    assert created["probability"] == 50
    assert created["expected_revenue"] == 60_000
    assert created["organization_name"] == "한빛정밀"
    assert created["contact_name"] == "김민준"
    assert created["promoted_contact"] is None

    edited = client.patch(f"/api/deals/{created['id']}", json={"value": 130_000, "probability": 60})
    assert (edited.json()["value"], edited.json()["probability"], edited.json()["expected_revenue"]) == (130_000, 60, 78_000)

    assert client.delete(f"/api/deals/{created['id']}").status_code == 204
    assert client.get(f"/api/deals/{created['id']}").status_code == 404


def test_every_deal_response_has_expected_revenue_and_late(client, make_deal):
    deal = make_deal(stage="qualified", close_date="2026-11-22")
    assert DEAL_FIELDS <= set(deal)
    for row in (client.get("/api/deals").json()[0], client.get(f"/api/deals/{deal['id']}").json()):
        assert DEAL_FIELDS <= set(row)
        assert (row["is_late"], row["days_late"]) == (True, 1)
    for column in client.get("/api/pipeline").json()["columns"]:
        for card in column["deals"]:
            assert DEAL_FIELDS <= set(card)


def test_value_and_probability_ranges(client):
    for body, field in (
        ({"value": -1}, "value"),
        ({"value": 1_000_000_001}, "value"),
        ({"value": 10, "probability": 101}, "probability"),
        ({"value": 10, "probability": -1}, "probability"),
        ({"value": 10, "stage": "done"}, "stage"),
        ({"value": 10, "contact_id": 999}, "contact_id"),
        ({"value": "많이"}, "value"),
    ):
        response = client.post("/api/deals", json={"name": "A", **body})
        assert response.status_code == 422, body
        assert response.json()["detail"][0]["loc"][-1] == field
    assert client.post("/api/deals", json={"name": "A", "value": 1_000_000_000}).status_code == 201
    assert client.post("/api/deals", json={"name": "A", "value": 0}).status_code == 201


def test_a_closed_deal_needs_a_close_date(client, make_deal):
    deal = make_deal(stage="won", close_date="2026-11-02")
    response = client.patch(f"/api/deals/{deal['id']}", json={"close_date": None})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "close_date"


def test_a_stage_change_by_edit_follows_rule_3(client, make_contact, make_deal):
    contact = make_contact(status="qualified")
    deal = make_deal(stage="negotiation", contact_id=contact["id"], close_date="2026-12-30")
    saved = client.patch(f"/api/deals/{deal['id']}", json={"stage": "won"}).json()
    assert (saved["stage"], saved["probability"], saved["close_date"]) == ("won", 100, "2026-11-23")
    assert saved["promoted_contact"] == {"id": contact["id"], "name": "김민준"}
    timeline = client.get(f"/api/deals/{deal['id']}/timeline").json()["items"]
    assert [(i["kind"], i["from_value"], i["to_value"]) for i in timeline] == [("stage_change", "negotiation", "won")]


def test_the_form_can_set_probability_and_close_date_with_the_stage(client, make_deal):
    deal = make_deal(stage="proposal")
    saved = client.patch(
        f"/api/deals/{deal['id']}", json={"stage": "lost", "probability": 5, "close_date": "2026-11-20"}
    ).json()
    assert (saved["probability"], saved["close_date"]) == (5, "2026-11-20")


def test_a_deal_created_closed_gets_today(make_deal):
    assert make_deal(stage="lost")["close_date"] == "2026-11-23"


def test_delete_impact_and_deleting_removes_its_activities(client, make_deal, make_activity, engine):
    deal = make_deal()
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "qualified"})
    make_activity(deal_id=deal["id"])
    assert client.get(f"/api/deals/{deal['id']}/delete-impact").json() == {"activities": 2}
    client.delete(f"/api/deals/{deal['id']}")
    from sqlalchemy import func, select

    from accountable.crm.tables import activities

    with engine.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(activities)) == 0


def test_a_missing_deal_returns_404(client):
    assert client.get("/api/deals/999").status_code == 404
    assert client.patch("/api/deals/999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/deals/999").status_code == 404
    assert client.get("/api/deals/999/delete-impact").status_code == 404
    assert client.get("/api/deals/999/timeline").status_code == 404
