"""GET /api/dashboard (API-7)."""

from fastapi import APIRouter

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.dashboard import repo
from accountable.crm.dashboard.schemas import Dashboard

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard(conn: Conn) -> Dashboard:
    return Dashboard(**repo.dashboard(conn, clock.today()))
