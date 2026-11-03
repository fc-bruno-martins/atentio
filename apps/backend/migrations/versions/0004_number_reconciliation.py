"""Tolerância a quedas e remoção garantida de instâncias.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "whatsapp_numbers", sa.Column("down_since", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "connection_attempts",
        sa.Column("instance_removed", sa.Boolean(), server_default=sa.false(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("connection_attempts", "instance_removed")
    op.drop_column("whatsapp_numbers", "down_since")
