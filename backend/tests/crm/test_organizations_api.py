"""Organizations' API (API-2, DATA-3, DEL-2)."""


def test_add_read_edit_delete(client, make_org):
    created = make_org("한빛정밀", industry=" 제조 ", website="hanbit.example", notes="핵심 고객")
    assert created["name"] == "한빛정밀"
    assert created["industry"] == "제조"
    assert created["website"] == "https://hanbit.example"

    read = client.get(f"/api/organizations/{created['id']}").json()
    assert read["notes"] == "핵심 고객"

    edited = client.patch(f"/api/organizations/{created['id']}", json={"name": "한빛정밀(주)", "notes": ""})
    assert edited.status_code == 200
    assert edited.json()["name"] == "한빛정밀(주)"
    assert edited.json()["notes"] is None
    assert edited.json()["industry"] == "제조"

    assert client.delete(f"/api/organizations/{created['id']}").status_code == 204
    assert client.get(f"/api/organizations/{created['id']}").status_code == 404


def test_a_website_with_a_scheme_is_kept(make_org):
    assert make_org(website="http://old.example")["website"] == "http://old.example"


def test_a_wrong_field_returns_422_with_its_name(client):
    for body, field in (
        ({"name": ""}, "name"),
        ({"name": "   "}, "name"),
        ({"name": "x" * 201}, "name"),
        ({"name": "ok", "notes": "x" * 5001}, "notes"),
        ({}, "name"),
    ):
        response = client.post("/api/organizations", json=body)
        assert response.status_code == 422, body
        assert response.json()["detail"][0]["loc"][-1] == field


def test_a_name_can_not_be_emptied_by_edit(client, make_org):
    org = make_org()
    response = client.patch(f"/api/organizations/{org['id']}", json={"name": None})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "name"


def test_a_missing_record_returns_404(client):
    assert client.get("/api/organizations/999").status_code == 404
    assert client.patch("/api/organizations/999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/organizations/999").status_code == 404
    assert client.get("/api/organizations/999/delete-impact").status_code == 404


def test_the_list_has_contact_counts_and_open_pipeline(client, make_org, make_contact, make_deal):
    org = make_org("한빛정밀")
    other = make_org("대성기계공업")
    make_contact("박서연", organization_id=org["id"])
    make_contact("김도현", organization_id=org["id"])
    make_deal("A", value=10_000, stage="proposal", organization_id=org["id"])
    make_deal("B", value=5_000, stage="new", organization_id=org["id"])
    make_deal("C", value=99_000, stage="won", organization_id=org["id"])
    rows = {row["name"]: row for row in client.get("/api/organizations").json()}
    assert (rows["한빛정밀"]["contact_count"], rows["한빛정밀"]["open_deal_count"], rows["한빛정밀"]["open_deal_value"]) == (2, 2, 15_000)
    assert (rows["대성기계공업"]["contact_count"], rows["대성기계공업"]["open_deal_value"]) == (0, 0)
    assert other["id"] in {row["id"] for row in rows.values()}


def test_the_detail_has_its_contacts_and_deals(client, make_org, make_contact, make_deal):
    org = make_org()
    contact = make_contact("박서연", organization_id=org["id"])
    make_deal("A", value=10_000, stage="negotiation", organization_id=org["id"], contact_id=contact["id"])
    make_deal("B", value=7_000, stage="won", organization_id=org["id"])
    detail = client.get(f"/api/organizations/{org['id']}").json()
    assert [c["name"] for c in detail["contacts"]] == ["박서연"]
    assert {d["name"] for d in detail["deals"]} == {"A", "B"}
    deal_a = next(d for d in detail["deals"] if d["name"] == "A")
    assert deal_a["expected_revenue"] == 7_500
    assert deal_a["contact_name"] == "박서연"
    assert "is_late" in deal_a
    assert (detail["open_deal_count"], detail["open_deal_value"], detail["won_value"]) == (1, 10_000, 7_000)


def test_delete_impact_and_deleting_keeps_contacts_and_deals(client, make_org, make_contact, make_deal):
    org = make_org()
    contact = make_contact(organization_id=org["id"])
    deal = make_deal(organization_id=org["id"])
    make_deal("다른 곳")
    assert client.get(f"/api/organizations/{org['id']}/delete-impact").json() == {"contacts": 1, "deals": 1}
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/contacts/{contact['id']}").json()["organization_id"] is None
    assert client.get(f"/api/deals/{deal['id']}").json()["organization_id"] is None
