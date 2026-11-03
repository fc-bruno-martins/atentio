import asyncio

import pytest
from alembic import command
from alembic.util.exc import CommandError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from tests.conftest import alembic_config

pytestmark = pytest.mark.integration


async def _version(url: str) -> str | None:
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            return await conn.scalar(text("SELECT version_num FROM alembic_version"))
    finally:
        await engine.dispose()


async def test_upgrade_downgrade_upgrade(postgres_url: str) -> None:
    config = alembic_config()

    await asyncio.to_thread(command.downgrade, config, "base")
    assert await _version(postgres_url) is None

    await asyncio.to_thread(command.upgrade, config, "head")
    assert await _version(postgres_url) == "0007"


async def test_modelos_e_migracoes_estao_sincronizados(postgres_url: str) -> None:
    try:
        await asyncio.to_thread(command.check, alembic_config())
    except CommandError as error:  # pragma: no cover
        pytest.fail(f"migração desatualizada: {error}")
