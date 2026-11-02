"""Ambiente Alembic assíncrono; URL lida de DATABASE_URL."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401  registra as tabelas no metadata
from app.core.config import DatabaseSettings, load_settings
from app.core.database import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def _run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async() -> None:
    engine = create_async_engine(load_settings(DatabaseSettings).database_url)
    async with engine.begin() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    raise SystemExit("modo offline não suportado; rode com DATABASE_URL apontando para o banco")
asyncio.run(_run_async())
