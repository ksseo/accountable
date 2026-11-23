"""GET /api/meta and GET /api/health (API-1, API-8, DATA-8)."""

from sqlalchemy import insert

from accountable.crm.tables import organizations


def test_health_answers(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_meta_lists_the_stages_with_korean_names_and_probabilities(client):
    meta = client.get("/api/meta").json()
    assert [(s["key"], s["label"], s["probability"], s["open"]) for s in meta["stages"]] == [
        ("new", "신규", 10, True),
        ("qualified", "적격", 25, True),
        ("proposal", "제안", 50, True),
        ("negotiation", "협상", 75, True),
        ("won", "수주", 100, False),
        ("lost", "실주", 0, False),
    ]


def test_meta_lists_statuses_and_kinds(client):
    meta = client.get("/api/meta").json()
    assert [(s["key"], s["label"]) for s in meta["statuses"]] == [
        ("lead", "리드"),
        ("qualified", "적격"),
        ("customer", "고객"),
    ]
    kinds = {k["key"]: (k["label"], k["automatic"]) for k in meta["activity_kinds"]}
    assert kinds == {
        "note": ("메모", False),
        "call": ("통화", False),
        "email": ("이메일", False),
        "stage_change": ("단계 변경", True),
        "status_change": ("상태 변경", True),
    }


def test_meta_gives_today(client):
    assert client.get("/api/meta").json()["today"] == "2026-11-23"


def test_meta_lists_the_industries_in_use(client, engine):
    with engine.begin() as conn:
        conn.execute(
            insert(organizations),
            [
                {"name": "가", "industry": "제조"},
                {"name": "나", "industry": "식품"},
                {"name": "다", "industry": "제조"},
                {"name": "라", "industry": None},
                {"name": "마", "industry": ""},
            ],
        )
    assert client.get("/api/meta").json()["industries"] == ["식품", "제조"]
