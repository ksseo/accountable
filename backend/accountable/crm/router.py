"""The CRM area's routes, gathered so main.py mounts one router per area."""

from fastapi import APIRouter

from accountable.crm import meta
from accountable.crm.activities import routes as activities
from accountable.crm.contacts import routes as contacts
from accountable.crm.dashboard import routes as dashboard
from accountable.crm.deals import routes as deals
from accountable.crm.organizations import routes as organizations
from accountable.crm.pipeline import routes as pipeline

router = APIRouter()
for feature in (meta, organizations, contacts, deals, activities, pipeline, dashboard):
    router.include_router(feature.router)
