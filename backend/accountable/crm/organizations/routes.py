"""Organizations' endpoints (API-2)."""

from fastapi import APIRouter, Response

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.organizations import repo
from accountable.crm.organizations.schemas import (
    Organization,
    OrganizationDetail,
    OrganizationImpact,
    OrganizationIn,
    OrganizationPatch,
    OrganizationRow,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("")
def list_organizations(conn: Conn) -> list[OrganizationRow]:
    return [OrganizationRow(**row) for row in repo.list_organizations(conn)]


@router.post("", status_code=201)
def create_organization(body: OrganizationIn, conn: Conn) -> Organization:
    return Organization(**repo.create_organization(conn, body.model_dump()))


@router.get("/{organization_id}")
def get_organization(organization_id: int, conn: Conn) -> OrganizationDetail:
    return OrganizationDetail(**repo.get_organization(conn, organization_id, clock.today()))


@router.patch("/{organization_id}")
def update_organization(organization_id: int, body: OrganizationPatch, conn: Conn) -> Organization:
    return Organization(**repo.update_organization(conn, organization_id, body.model_dump(exclude_unset=True)))


@router.get("/{organization_id}/delete-impact")
def organization_delete_impact(organization_id: int, conn: Conn) -> OrganizationImpact:
    return OrganizationImpact(**repo.delete_impact(conn, organization_id))


@router.delete("/{organization_id}", status_code=204)
def delete_organization(organization_id: int, conn: Conn) -> Response:
    repo.delete_organization(conn, organization_id)
    return Response(status_code=204)
