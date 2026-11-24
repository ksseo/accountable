"""Contacts' API (API-3, DATA-4, RULE-8, DEL-2)."""


def test_add_read_edit_delete(client, make_org, make_contact):
    org = make_org()
    created = make_contact(
        " 김민준 ",
        email="minjun@hanbit.example",
        phone="010-1234-5678",
        job_title="구매팀장",
        organization_id=org["id"],
    )
    assert created["name"] == "김민준"
    assert created["organization_name"] == "한빛정밀"
    assert created["status"] == "lead"

    edited = client.patch(f"/api/contacts/{created['id']}", json={"job_title": "구매본부장", "phone": ""})
    assert edited.json()["job_title"] == "구매본부장"
    assert edited.json()["phone"] is None
    assert edited.json()["email"] == "minjun@hanbit.example"

    assert client.delete(f"/api/contacts/{created['id']}").status_code == 204
    assert client.get(f"/api/contacts/{created['id']}").status_code == 404


def test_new_contacts_are_leads_unless_a_status_is_given(make_contact):
    assert make_contact()["status"] == "lead"
    assert make_contact("Sarah Kim", status="customer")["status"] == "customer"


def test_email_is_checked(client):
    response = client.post("/api/contacts", json={"name": "김민준", "email": "not an email"})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "email"
    assert client.post("/api/contacts", json={"name": "김민준", "email": ""}).json()["email"] is None


def test_wrong_fields_name_the_field(client):
    for body, field in (
        ({"name": "x", "phone": "1" * 41}, "phone"),
        ({"name": "x", "status": "vip"}, "status"),
        ({"name": "x", "organization_id": 999}, "organization_id"),
        ({"name": ""}, "name"),
    ):
        response = client.post("/api/contacts", json=body)
        assert response.status_code == 422, body
        assert response.json()["detail"][0]["loc"][-1] == field


def test_a_status_changed_by_hand_adds_an_entry(client, make_contact):
    contact = make_contact()
    client.patch(f"/api/contacts/{contact['id']}", json={"status": "qualified"})
    client.patch(f"/api/contacts/{contact['id']}", json={"status": "qualified", "name": "김민준"})
    client.patch(f"/api/contacts/{contact['id']}", json={"status": "lead"})
    items = client.get(f"/api/contacts/{contact['id']}/timeline").json()["items"]
    changes = [(i["kind"], i["from_value"], i["to_value"], i["description"]) for i in items]
    assert changes == [
        ("status_change", "qualified", "lead", None),
        ("status_change", "lead", "qualified", None),
    ]
    assert all(i["automatic"] for i in items)


def test_the_detail_has_its_organization_and_deals(client, make_org, make_contact, make_deal):
    org = make_org()
    contact = make_contact(organization_id=org["id"])
    make_deal("A", value=20_000, stage="proposal", contact_id=contact["id"], organization_id=org["id"])
    make_deal("B")
    detail = client.get(f"/api/contacts/{contact['id']}").json()
    assert detail["organization_name"] == "한빛정밀"
    assert [(d["name"], d["expected_revenue"], d["organization_name"]) for d in detail["deals"]] == [
        ("A", 10_000, "한빛정밀")
    ]


def test_delete_impact_and_deleting_keeps_deals_and_deletes_activities(
    client, make_contact, make_deal, make_activity
):
    contact = make_contact()
    deal = make_deal(contact_id=contact["id"])
    make_deal("둘째", contact_id=contact["id"])
    for text in ("하나", "둘", "셋"):
        make_activity(text, contact_id=contact["id"])
    on_deal = make_activity("거래에", deal_id=deal["id"])
    assert client.get(f"/api/contacts/{contact['id']}/delete-impact").json() == {"deals": 2, "activities": 3}

    assert client.delete(f"/api/contacts/{contact['id']}").status_code == 204
    assert client.get(f"/api/deals/{deal['id']}").json()["contact_id"] is None
    items = client.get(f"/api/deals/{deal['id']}/timeline").json()["items"]
    assert [i["id"] for i in items] == [on_deal["id"]]


def test_the_timeline_endpoint(client, make_contact):
    contact = make_contact()
    assert client.get(f"/api/contacts/{contact['id']}/timeline").json() == {
        "items": [],
        "total": 0,
        "offset": 0,
        "limit": 50,
    }
    assert client.get("/api/contacts/999/timeline").status_code == 404
    assert client.get(f"/api/contacts/{contact['id']}/timeline?offset=-1").status_code == 422
