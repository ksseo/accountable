"""Contact status changes (RULE-7, RULE-8).

A status changed by hand, or by a won deal, goes through change_status, which
adds the status_change entry. Nothing here lowers a status automatically.
"""

from sqlalchemy import Connection, select, update

from accountable.crm.activities.rules import add_automatic_entry
from accountable.crm.tables import contacts


def change_status(
    conn: Connection,
    contact_id: int,
    old_status: str,
    new_status: str,
    deal_name: str | None = None,
) -> None:
    """Sets the status and adds a status_change entry. A won deal's name is
    kept in the entry as it was at that moment, for "(‘…’ 수주)"."""
    conn.execute(update(contacts).where(contacts.c.id == contact_id).values(status=new_status))
    add_automatic_entry(
        conn,
        "status_change",
        contact_id=contact_id,
        from_value=old_status,
        to_value=new_status,
        description=deal_name,
    )


def promote_to_customer(conn: Connection, contact_id: int, deal_name: str) -> dict | None:
    """Makes the main contact of a won deal a customer, if they aren't one.

    Returns the contact's id and name when their status changed."""
    row = conn.execute(select(contacts.c.name, contacts.c.status).where(contacts.c.id == contact_id)).first()
    if row is None or row.status == "customer":
        return None
    change_status(conn, contact_id, row.status, "customer", deal_name=deal_name)
    return {"id": contact_id, "name": row.name}
