import asyncio
from datetime import UTC, datetime
from uuid import uuid4

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
    assert await _version(postgres_url) == "0010"


async def test_modelos_e_migracoes_estao_sincronizados(postgres_url: str) -> None:
    try:
        await asyncio.to_thread(command.check, alembic_config())
    except CommandError as error:  # pragma: no cover
        pytest.fail(f"migração desatualizada: {error}")


async def test_generalizar_canais_preserva_dados_e_volta(postgres_url: str) -> None:
    config = alembic_config()
    await asyncio.to_thread(command.upgrade, config, "head")
    await asyncio.to_thread(command.downgrade, config, "0007")
    engine = create_async_engine(postgres_url)
    company, user, number, conversation, message = (uuid4() for _ in range(5))
    now = datetime.now(UTC)
    async with engine.begin() as conn:
        await conn.execute(
            text("INSERT INTO companies (id, name) VALUES (:id, 'Acme')"), {"id": company}
        )
        await conn.execute(
            text(
                "INSERT INTO users (id, company_id, email, name, password_hash, role) "
                "VALUES (:id, :company, 'a@acme.com', 'Ana', 'h', 'user')"
            ),
            {"id": user, "company": company},
        )
        await conn.execute(
            text(
                "INSERT INTO whatsapp_numbers (id, company_id, owner_user_id, phone, status, "
                "status_changed_at, instance_name, message_events_enabled) VALUES (:id, :company, "
                ":user, '5511999999999', 'connected', :now, 'instancia', true)"
            ),
            {"id": number, "company": company, "user": user, "now": now},
        )
        await conn.execute(
            text(
                "INSERT INTO conversations (id, company_id, owner_user_id, number_id, remote_jid, "
                "kind, last_message_at) VALUES "
                "(:id, :company, :user, :number, '5511@s', 'direct', :now)"
            ),
            {"id": conversation, "company": company, "user": user, "number": number, "now": now},
        )
        await conn.execute(
            text(
                "INSERT INTO messages (id, company_id, owner_user_id, number_id, conversation_id, "
                "external_id, from_me, sender_jid, type, text, sent_at) VALUES "
                "(:id, :company, :user, :number, :conversation, 'A', false, '55@s', 'text', "
                "'oi', :now)"
            ),
            {
                "id": message,
                "company": company,
                "user": user,
                "number": number,
                "conversation": conversation,
                "now": now,
            },
        )

    await asyncio.to_thread(command.upgrade, config, "head")
    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text("SELECT channel, external_account, session_ref FROM channel_connections")
            )
        ).one()
        assert tuple(row) == ("whatsapp", "5511999999999", "instancia")
        channel = await conn.scalar(text("SELECT channel FROM conversations"))
        assert channel == "whatsapp"
        assert await conn.scalar(text("SELECT sender_ref FROM messages")) == "55@s"

    await asyncio.to_thread(command.downgrade, config, "0007")
    async with engine.connect() as conn:
        assert await conn.scalar(text("SELECT phone FROM whatsapp_numbers")) == "5511999999999"
        assert await conn.scalar(text("SELECT sender_jid FROM messages")) == "55@s"
    await asyncio.to_thread(command.upgrade, config, "head")
    async with engine.begin() as conn:
        await conn.execute(
            text("TRUNCATE messages, conversations, channel_connections, users, companies CASCADE")
        )
    await engine.dispose()
