"""The CRM area: organizations, contacts, deals and activities.

Revision ID: 0001_crm
Revises:
Create Date: 2026-11-23
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_crm"
down_revision = None
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("website", sa.Text()),
        sa.Column("industry", sa.String(200)),
        sa.Column("notes", sa.Text()),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_organizations"),
    )

    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(40)),
        sa.Column("job_title", sa.String(200)),
        sa.Column("organization_id", sa.Integer()),
        sa.Column("status", sa.String(20), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_contacts"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_contacts_organization_id_organizations",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint("status IN ('lead', 'qualified', 'customer')", name="ck_contacts_status"),
    )
    op.create_index("ix_contacts_organization_id", "contacts", ["organization_id"])

    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("organization_id", sa.Integer()),
        sa.Column("contact_id", sa.Integer()),
        sa.Column("stage", sa.String(20), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("probability", sa.Integer(), nullable=False),
        sa.Column("close_date", sa.Date()),
        sa.Column("position", sa.Float(), nullable=False),
        sa.Column("furthest_open_stage", sa.String(20), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_deals"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_deals_organization_id_organizations",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["contacts.id"],
            name="fk_deals_contact_id_contacts",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')",
            name="ck_deals_stage",
        ),
        sa.CheckConstraint(
            "furthest_open_stage IN ('new', 'qualified', 'proposal', 'negotiation')",
            name="ck_deals_furthest_open_stage",
        ),
        sa.CheckConstraint("value >= 0 AND value <= 1000000000", name="ck_deals_value"),
        sa.CheckConstraint("probability >= 0 AND probability <= 100", name="ck_deals_probability"),
        sa.CheckConstraint(
            "NOT (stage IN ('won', 'lost')) OR close_date IS NOT NULL",
            name="ck_deals_closed_has_close_date",
        ),
    )
    op.create_index("ix_deals_organization_id", "deals", ["organization_id"])
    op.create_index("ix_deals_contact_id", "deals", ["contact_id"])
    op.create_index("ix_deals_close_date", "deals", ["close_date"])
    op.create_index("ix_deals_stage_position", "deals", ["stage", "position"])

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("contact_id", sa.Integer()),
        sa.Column("deal_id", sa.Integer()),
        sa.Column("description", sa.Text()),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("follow_up_date", sa.Date()),
        sa.Column("follow_up_done", sa.Boolean(), nullable=False),
        sa.Column("from_value", sa.String(20)),
        sa.Column("to_value", sa.String(20)),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name="pk_activities"),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["contacts.id"],
            name="fk_activities_contact_id_contacts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deal_id"],
            ["deals.id"],
            name="fk_activities_deal_id_deals",
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "kind IN ('note', 'call', 'email', 'stage_change', 'status_change')",
            name="ck_activities_kind",
        ),
        sa.CheckConstraint("(contact_id IS NULL) <> (deal_id IS NULL)", name="ck_activities_one_record"),
    )
    op.create_index("ix_activities_contact_id_occurred_at", "activities", ["contact_id", "occurred_at"])
    op.create_index("ix_activities_deal_id_occurred_at", "activities", ["deal_id", "occurred_at"])
    op.create_index("ix_activities_occurred_at", "activities", ["occurred_at"])
    op.create_index(
        "ix_activities_follow_up_done_follow_up_date",
        "activities",
        ["follow_up_done", "follow_up_date"],
    )


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("deals")
    op.drop_table("contacts")
    op.drop_table("organizations")
