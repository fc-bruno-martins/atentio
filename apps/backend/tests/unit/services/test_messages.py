from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.actor import Actor
from app.domain.errors import InvalidPeriod, NotFound
from app.domain.message import IncomingMessage, MessageType
from app.domain.number import DisconnectReason, WhatsAppNumber
from app.domain.user import Role
from app.services.messages import MessageService
from tests.fakes import FakeMessages, FakeNumbers, FakeWhatsApp

pytestmark = pytest.mark.unit
NOW = datetime(2026, 11, 2, 12, tzinfo=UTC)


def _incoming(external_id: str = "A", sent_at: datetime = NOW) -> IncomingMessage:
    return IncomingMessage(
        external_id=external_id,
        remote_jid="5511@s.whatsapp.net",
        from_me=False,
        sender_jid=None,
        sender_name="Ana",
        type=MessageType.TEXT,
        text="oi",
        sent_at=sent_at,
    )


class World:
    def __init__(self) -> None:
        self.messages = FakeMessages()
        self.numbers = FakeNumbers()
        self.owner = Actor(uuid4(), uuid4(), Role.USER, uuid4())
        self.number = WhatsAppNumber.connect(
            company_id=self.owner.company_id,  # type: ignore[arg-type]
            owner_user_id=self.owner.user_id,
            phone="5511999999999",
            instance_name="i",
            now=NOW,
        )
        self.numbers.items[self.number.id] = self.number
        self.service = MessageService(self.messages, self.numbers, FakeWhatsApp(), lambda: NOW, 7)


async def test_captura_uma_vez() -> None:
    world = World()
    assert await world.service.capture("i", [_incoming(), _incoming()]) == 1


async def test_numero_desconectado_nao_captura() -> None:
    world = World()
    world.number.disconnect(DisconnectReason.OWNER, NOW)
    assert await world.service.capture("i", [_incoming()]) == 0


async def test_instancia_desconhecida_nao_captura() -> None:
    assert await World().service.capture("outra", [_incoming()]) == 0


async def test_outra_pessoa_nao_le() -> None:
    world = World()
    await world.service.capture("i", [_incoming()])
    [conversation] = await world.service.list_conversations(world.owner)
    other = Actor(uuid4(), uuid4(), Role.COMPANY_ADMIN, world.owner.company_id)
    assert await world.service.list_conversations(other) == []
    with pytest.raises(NotFound):
        await world.service.read(other, conversation.id)


async def test_filtra_por_periodo() -> None:
    world = World()
    await world.service.capture("i", [_incoming("A", NOW - timedelta(days=2)), _incoming("B", NOW)])
    [conversation] = await world.service.list_conversations(world.owner)
    result = await world.service.read(
        world.owner, conversation.id, since=NOW - timedelta(hours=1), until=NOW + timedelta(hours=1)
    )
    assert [m.sent_at for m in result.messages] == [NOW]


async def test_periodo_invertido_e_recusado() -> None:
    world = World()
    with pytest.raises(InvalidPeriod):
        await world.service.read(world.owner, uuid4(), since=NOW, until=NOW)


async def test_expurga_o_que_passou_do_prazo() -> None:
    world = World()
    await world.service.capture(
        "i", [_incoming("A", NOW - timedelta(days=8)), _incoming("B", NOW - timedelta(days=6))]
    )
    assert await world.service.purge_expired() == 1
