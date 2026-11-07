"""Generaliza conexões, conversas e mensagens por canal, preservando os dados.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("whatsapp_numbers", "channel_connections")
    op.add_column(
        "channel_connections",
        sa.Column("channel", sa.String(20), server_default="whatsapp", nullable=False),
    )
    op.alter_column(
        "channel_connections",
        "phone",
        new_column_name="external_account",
        type_=sa.String(100),
        existing_type=sa.String(15),
    )
    op.alter_column(
        "channel_connections",
        "instance_name",
        new_column_name="session_ref",
        type_=sa.String(100),
        existing_type=sa.String(60),
    )
    op.execute(
        "ALTER INDEX ix_whatsapp_numbers_company_id RENAME TO ix_channel_connections_company_id"
    )
    op.execute(
        "ALTER TABLE channel_connections RENAME CONSTRAINT "
        "ck_whatsapp_numbers_ck_whatsapp_numbers_valid_status "
        "TO ck_channel_connections_valid_status"
    )
    op.execute("ALTER INDEX pk_whatsapp_numbers RENAME TO pk_channel_connections")
    op.drop_constraint("uq_whatsapp_numbers_owner_phone", "channel_connections", type_="unique")
    op.drop_index("uq_whatsapp_numbers_connected_phone", table_name="channel_connections")
    op.create_unique_constraint(
        "uq_channel_connections_owner_account",
        "channel_connections",
        ["owner_user_id", "channel", "external_account"],
    )
    op.create_index(
        "uq_channel_connections_connected_account",
        "channel_connections",
        ["channel", "external_account"],
        unique=True,
        postgresql_where=sa.text("status = 'connected'"),
    )

    op.alter_column("conversations", "number_id", new_column_name="connection_id")
    op.alter_column("conversations", "remote_jid", new_column_name="external_ref")
    op.add_column(
        "conversations",
        sa.Column("channel", sa.String(20), server_default="whatsapp", nullable=False),
    )
    op.execute(
        "ALTER TABLE conversations RENAME CONSTRAINT "
        "uq_conversations_number_jid TO uq_conversations_connection_ref"
    )
    op.alter_column("messages", "number_id", new_column_name="connection_id")
    op.alter_column("messages", "sender_jid", new_column_name="sender_ref")
    op.execute(
        "ALTER TABLE messages RENAME CONSTRAINT "
        "uq_messages_number_external TO uq_messages_connection_external"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE messages RENAME CONSTRAINT "
        "uq_messages_connection_external TO uq_messages_number_external"
    )
    op.alter_column("messages", "sender_ref", new_column_name="sender_jid")
    op.alter_column("messages", "connection_id", new_column_name="number_id")
    op.execute(
        "ALTER TABLE conversations RENAME CONSTRAINT "
        "uq_conversations_connection_ref TO uq_conversations_number_jid"
    )
    op.drop_column("conversations", "channel")
    op.alter_column("conversations", "external_ref", new_column_name="remote_jid")
    op.alter_column("conversations", "connection_id", new_column_name="number_id")

    op.drop_index("uq_channel_connections_connected_account", table_name="channel_connections")
    op.drop_constraint(
        "uq_channel_connections_owner_account", "channel_connections", type_="unique"
    )
    # Conexões de outros canais não existem no esquema antigo.
    op.execute("DELETE FROM channel_connections WHERE channel <> 'whatsapp'")
    op.create_unique_constraint(
        "uq_whatsapp_numbers_owner_phone",
        "channel_connections",
        ["owner_user_id", "external_account"],
    )
    op.create_index(
        "uq_whatsapp_numbers_connected_phone",
        "channel_connections",
        ["external_account"],
        unique=True,
        postgresql_where=sa.text("status = 'connected'"),
    )
    op.execute(
        "ALTER TABLE channel_connections RENAME CONSTRAINT "
        "ck_channel_connections_valid_status "
        "TO ck_whatsapp_numbers_ck_whatsapp_numbers_valid_status"
    )
    op.execute("ALTER INDEX pk_channel_connections RENAME TO pk_whatsapp_numbers")
    op.execute(
        "ALTER INDEX ix_channel_connections_company_id RENAME TO ix_whatsapp_numbers_company_id"
    )
    op.alter_column(
        "channel_connections",
        "session_ref",
        new_column_name="instance_name",
        type_=sa.String(60),
        existing_type=sa.String(100),
    )
    op.alter_column(
        "channel_connections",
        "external_account",
        new_column_name="phone",
        type_=sa.String(15),
        existing_type=sa.String(100),
    )
    op.drop_column("channel_connections", "channel")
    op.rename_table("channel_connections", "whatsapp_numbers")
