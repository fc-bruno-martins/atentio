from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.actor import Actor
from app.domain.errors import NotFound, NumberLimitReached, WhatsAppUnavailable
from app.domain.number import AttemptStatus, DisconnectReason, NumberStatus, WhatsAppNumber
from app.domain.user import Role, User
from app.services.number_sync import NumberSyncService
from app.services.numbers import NumberService
from tests.fakes import FakeAttempts, FakeNumbers, FakeUsers, FakeWhatsApp

pytestmark = pytest.mark.unit
JID = "5511999999999:3@s.whatsapp.net"


class World:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 2, 12, tzinfo=UTC)
        self.numbers = FakeNumbers()
        self.attempts = FakeAttempts()
        self.gateway = FakeWhatsApp()
        self.users = FakeUsers()
        self.company = uuid4()
        self.actor = self.make_actor()
        sync = NumberSyncService(
            self.numbers, self.attempts, FakeUsers(), self.gateway, lambda: self.now
        )
        self.service = NumberService(
            self.numbers,
            self.attempts,
            self.users,
            self.gateway,
            sync,
            lambda: self.now,
            timedelta(minutes=5),
        )

    def make_actor(self) -> Actor:
        return Actor(uuid4(), uuid4(), Role.USER, self.company)

    def person(self, role: Role = Role.USER, company: object | None = None) -> Actor:
        user = User.create(
            company_id=company or self.company,  # type: ignore[arg-type]
            email=f"{uuid4().hex}@acme.com",
            name="Pessoa",
            password_hash="h",
            role=role,
        )
        self.users.items[user.id] = user
        return Actor(user.id, uuid4(), role, user.company_id)

    def connected(self, actor: Actor, phone: str) -> WhatsAppNumber:
        number = WhatsAppNumber.connect(
            company_id=self.company,
            owner_user_id=actor.user_id,
            phone=phone,
            instance_name=f"i-{phone}",
            now=self.now,
        )
        self.numbers.items[number.id] = number
        return number


async def test_iniciar_devolve_qr_sem_criar_numero() -> None:
    world = World()
    view = await world.service.start(world.actor)
    assert view.qr_code == FakeWhatsApp.QR
    assert view.attempt.is_pending
    assert await world.service.list_numbers(world.actor) == []


async def test_terceiro_numero_conectado_e_recusado() -> None:
    world = World()
    world.connected(world.actor, "5511000000001")
    world.connected(world.actor, "5511000000002")
    with pytest.raises(NumberLimitReached):
        await world.service.start(world.actor)
    assert world.gateway.instances == {}


async def test_numero_desconectado_nao_conta_no_limite() -> None:
    world = World()
    world.connected(world.actor, "5511000000001")
    world.connected(world.actor, "5511000000002").status = NumberStatus.DISCONNECTED
    assert (await world.service.start(world.actor)).attempt.is_pending


async def test_nova_tentativa_cancela_a_anterior() -> None:
    world = World()
    first = (await world.service.start(world.actor)).attempt
    second = (await world.service.start(world.actor)).attempt
    assert first.status is AttemptStatus.CANCELLED
    assert second.is_pending
    assert first.instance_name in world.gateway.deleted


async def test_evolution_fora_ao_iniciar() -> None:
    world = World()
    world.gateway.available = False
    with pytest.raises(WhatsAppUnavailable):
        await world.service.start(world.actor)
    assert world.attempts.items == {}


async def test_consulta_renova_o_qr() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    view = await world.service.get(world.actor, attempt.id)
    assert view.qr_code == FakeWhatsApp.QR


async def test_qr_so_para_quem_iniciou() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    other = Actor(uuid4(), uuid4(), Role.COMPANY_ADMIN, world.company)
    with pytest.raises(NotFound):
        await world.service.get(other, attempt.id)
    with pytest.raises(NotFound):
        await world.service.cancel(other, attempt.id)


async def test_tentativa_expirada_some_sem_criar_numero() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    world.now += timedelta(minutes=5)
    view = await world.service.get(world.actor, attempt.id)
    assert view.attempt.status is AttemptStatus.EXPIRED
    assert view.qr_code is None
    assert attempt.instance_name in world.gateway.deleted
    assert world.numbers.items == {}


async def test_consulta_conclui_mesmo_sem_webhook() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    world.gateway.scan(attempt.instance_name, JID)
    view = await world.service.get(world.actor, attempt.id)
    assert view.attempt.status is AttemptStatus.CONNECTED
    assert view.qr_code is None


async def test_tentativa_concluida_nao_chama_o_servico_de_whatsapp() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    world.gateway.scan(attempt.instance_name, JID)
    await world.service.get(world.actor, attempt.id)
    world.gateway.available = False
    assert (await world.service.get(world.actor, attempt.id)).attempt.number_id is not None


async def test_cancelar_remove_a_instancia() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    await world.service.cancel(world.actor, attempt.id)
    assert attempt.status is AttemptStatus.CANCELLED
    assert attempt.instance_name in world.gateway.logged_out
    assert attempt.instance_name in world.gateway.deleted


async def test_cancelar_com_evolution_fora_mantem_o_cancelamento() -> None:
    world = World()
    attempt = (await world.service.start(world.actor)).attempt
    world.gateway.available = False
    await world.service.cancel(world.actor, attempt.id)
    assert attempt.status is AttemptStatus.CANCELLED


async def test_lista_so_os_proprios_numeros() -> None:
    world = World()
    other = world.make_actor()
    mine = world.connected(world.actor, "5511000000001")
    world.connected(other, "5511000000002")
    assert await world.service.list_numbers(world.actor) == [mine]


async def test_dono_desconecta_e_a_instancia_sai() -> None:
    world = World()
    number = world.connected(world.actor, "5511000000001")
    result = await world.service.disconnect(world.actor, number.id)
    assert result.disconnect_reason is DisconnectReason.OWNER
    assert result.disconnected_by == world.actor.user_id
    assert result.instance_name is None
    assert "i-5511000000001" in world.gateway.deleted


async def test_desconectar_com_evolution_fora_desconecta_e_deixa_a_instancia_pendente() -> None:
    world = World()
    number = world.connected(world.actor, "5511000000001")
    world.gateway.available = False
    result = await world.service.disconnect(world.actor, number.id)
    assert not result.is_connected
    assert result.instance_name == "i-5511000000001"


async def test_outra_pessoa_nao_desconecta() -> None:
    world = World()
    number = world.connected(world.actor, "5511000000001")
    with pytest.raises(NotFound):
        await world.service.disconnect(world.make_actor(), number.id)
    assert number.is_connected


async def test_admin_lista_numeros_com_o_dono() -> None:
    world = World()
    admin = world.person(Role.COMPANY_ADMIN)
    user = world.person()
    number = world.connected(user, "5511000000001")
    [item] = await world.service.list_company_numbers(admin)
    assert item.number == number
    assert item.owner.id == user.user_id


async def test_admin_nao_ve_outra_empresa() -> None:
    world = World()
    admin = world.person(Role.COMPANY_ADMIN, uuid4())
    number = world.connected(world.person(), "5511000000001")
    assert await world.service.list_company_numbers(admin) == []
    with pytest.raises(NotFound):
        await world.service.disconnect_in_company(admin, number.id)
    assert number.is_connected


async def test_admin_desconecta_e_fica_registrado() -> None:
    world = World()
    admin = world.person(Role.COMPANY_ADMIN)
    number = world.connected(world.person(), "5511000000001")
    item = await world.service.disconnect_in_company(admin, number.id)
    assert item.number.disconnect_reason is DisconnectReason.COMPANY_ADMIN
    assert item.number.disconnected_by == admin.user_id


async def test_admin_desconectando_o_proprio_numero_conta_como_dono() -> None:
    world = World()
    admin = world.person(Role.COMPANY_ADMIN)
    number = world.connected(admin, "5511000000001")
    item = await world.service.disconnect_in_company(admin, number.id)
    assert item.number.disconnect_reason is DisconnectReason.OWNER
