"""Conversas e mensagens capturadas.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
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
    op.add_column(
        "whatsapp_numbers",
        sa.Column(
            "message_events_enabled", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
    )
    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("number_id", sa.Uuid(), sa.ForeignKey("whatsapp_numbers.id"), nullable=False),
        sa.Column("remote_jid", sa.String(100), nullable=False),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("name", sa.String(200)),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False),
        *_timestamps(),
        sa.CheckConstraint("kind IN ('direct', 'group')", name="ck_conversations_valid_kind"),
        sa.UniqueConstraint("number_id", "remote_jid", name="uq_conversations_number_jid"),
    )
    op.create_index(
        "ix_conversations_owner_last", "conversations", ["owner_user_id", "last_message_at"]
    )
    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("number_id", sa.Uuid(), sa.ForeignKey("whatsapp_numbers.id"), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("from_me", sa.Boolean(), nullable=False),
        sa.Column("sender_jid", sa.String(100)),
        sa.Column("sender_name", sa.String(200)),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("text", sa.Text()),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        *_timestamps(),
        sa.UniqueConstraint("number_id", "external_id", name="uq_messages_number_external"),
    )
    op.create_index("ix_messages_conversation_sent", "messages", ["conversation_id", "sent_at"])
    op.create_index("ix_messages_sent_at", "messages", ["sent_at"])


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_column("whatsapp_numbers", "message_events_enabled")
