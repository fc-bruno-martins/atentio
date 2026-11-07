"""Rastro dos agentes na análise e o estado "em andamento".

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("steps", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )


def downgrade() -> None:
    op.execute("UPDATE analyses SET status = 'failed' WHERE status = 'running'")
    op.drop_column("analyses", "steps")
