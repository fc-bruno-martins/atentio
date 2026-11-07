"""Reaplica o webhook das conexões do WhatsApp com o cabeçalho novo.

A reconciliação chama `webhook/set` nos números marcados aqui.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-03
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE channel_connections SET message_events_enabled = false "
        "WHERE channel = 'whatsapp' AND status = 'connected'"
    )


def downgrade() -> None:
    # Nada a desfazer: o estado volta a verdadeiro na reconciliação seguinte.
    pass
