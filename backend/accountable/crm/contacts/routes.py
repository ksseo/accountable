"""Contacts' endpoints (API-3). The timeline is in activities/routes.py."""

from fastapi import APIRouter, Response

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.contacts import repo
from accountable.crm.contacts.schemas import Contact, ContactDetail, ContactImpact, ContactIn, ContactPatch

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
def list_contacts(conn: Conn) -> list[Contact]:
    return [Contact(**row) for row in repo.list_contacts(conn)]


@router.post("", status_code=201)
def create_contact(body: ContactIn, conn: Conn) -> Contact:
    return Contact(**repo.create_contact(conn, body.model_dump()))


@router.get("/{contact_id}")
def get_contact(contact_id: int, conn: Conn) -> ContactDetail:
    return ContactDetail(**repo.get_contact(conn, contact_id, clock.today()))


@router.patch("/{contact_id}")
def update_contact(contact_id: int, body: ContactPatch, conn: Conn) -> Contact:
    return Contact(**repo.update_contact(conn, contact_id, body.model_dump(exclude_unset=True)))


@router.get("/{contact_id}/delete-impact")
def contact_delete_impact(contact_id: int, conn: Conn) -> ContactImpact:
    return ContactImpact(**repo.delete_impact(conn, contact_id))


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: Conn) -> Response:
    repo.delete_contact(conn, contact_id)
    return Response(status_code=204)
