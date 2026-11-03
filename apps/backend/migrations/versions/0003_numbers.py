"""Números de WhatsApp e tentativas de conexão.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column[object]]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "whatsapp_numbers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("status_changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("instance_name", sa.String(60)),
        sa.Column("disconnect_reason", sa.String(30)),
        sa.Column("disconnected_by", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("last_confirmed_at", sa.DateTime(timezone=True)),
        *_timestamps(),
        sa.CheckConstraint(
            "status IN ('connected', 'disconnected')", name="ck_whatsapp_numbers_valid_status"
        ),
        sa.UniqueConstraint("owner_user_id", "phone", name="uq_whatsapp_numbers_owner_phone"),
    )
    op.create_index("ix_whatsapp_numbers_company_id", "whatsapp_numbers", ["company_id"])
    op.create_index(
        "uq_whatsapp_numbers_connected_phone",
        "whatsapp_numbers",
        ["phone"],
        unique=True,
        postgresql_where=sa.text("status = 'connected'"),
    )
    op.create_table(
        "connection_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("instance_name", sa.String(60), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("failure", sa.String(30)),
        sa.Column("number_id", sa.Uuid(), sa.ForeignKey("whatsapp_numbers.id")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "status IN ('pending', 'connected', 'rejected', 'expired', 'cancelled')",
            name="ck_connection_attempts_valid_status",
        ),
    )
    op.create_index("ix_connection_attempts_user_id", "connection_attempts", ["user_id"])


def downgrade() -> None:
    op.drop_table("connection_attempts")
    op.drop_table("whatsapp_numbers")
