from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.domain.platform_status import Component, ComponentStatus


class DatabaseProbe:
    """HealthProbe do PostgreSQL e leitor da versão do esquema (Alembic)."""

    component = Component.DATABASE

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def check(self) -> ComponentStatus:
        try:
            async with self._engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except (SQLAlchemyError, OSError):
            return ComponentStatus.down(self.component, "banco de dados inacessível")
        return ComponentStatus.up(self.component)

    async def current_version(self) -> str | None:
        async with self._engine.connect() as conn:
            if await conn.scalar(text("SELECT to_regclass('alembic_version')")) is None:
                return None
            version = await conn.scalar(text("SELECT version_num FROM alembic_version"))
            return str(version) if version is not None else None
