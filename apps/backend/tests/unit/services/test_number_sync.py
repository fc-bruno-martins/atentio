from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.errors import WhatsAppUnavailable
from app.domain.number import (
    AttemptFailure,
    AttemptStatus,
    ConnectionAttempt,
    DisconnectReason,
    InstanceInfo,
    NumberStatus,
    WhatsAppNumber,
)
from app.services.number_sync import NumberSyncService
from tests.fakes import FakeAttempts, FakeNumbers, FakeUsers, FakeWhatsApp

pytestmark = pytest.mark.unit
PHONE = "5511999999999"
JID = f"{PHONE}:3@s.whatsapp.net"


class World:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 2, 12, tzinfo=UTC)
        self.numbers = FakeNumbers()
        self.attempts = FakeAttempts()
        self.gateway = FakeWhatsApp()
        self.company = uuid4()
        self.user = uuid4()
        self.sync = NumberSyncService(
            self.numbers, self.attempts, FakeUsers(), self.gateway, lambda: self.now
        )

    async def attempt(self, jid: str | None = JID) -> ConnectionAttempt:
        attempt = ConnectionAttempt.start(
            company_id=self.company, user_id=self.user, now=self.now, ttl=timedelta(minutes=5)
        )
        await self.attempts.add(attempt)
        if jid:
            self.gateway.scan(attempt.instance_name, jid)
        return attempt

    def number(self, owner: object, phone: str, *, connected: bool = True) -> WhatsAppNumber:
        number = WhatsAppNumber.connect(
            company_id=self.company,
            owner_user_id=owner,  # type: ignore[arg-type]
            phone=phone,
            instance_name=f"old-{phone}",
            now=self.now - timedelta(days=1),
        )
        if not connected:
            number.status = NumberStatus.DISCONNECTED
            number.instance_name = None
        self.numbers.items[number.id] = number
        return number

    async def opened(self, attempt: ConnectionAttempt) -> None:
        await self.sync.handle_event("connection.update", attempt.instance_name, "open")


async def test_conexao_registra_o_telefone_lido_da_instancia() -> None:
    world = World()
    attempt = await world.attempt()
    await world.opened(attempt)
    number = next(iter(world.numbers.items.values()))
    assert number.phone == PHONE
    assert number.is_connected
    assert number.owner_user_id == world.user
    assert number.company_id == world.company
    assert attempt.status is AttemptStatus.CONNECTED
    assert attempt.number_id == number.id


async def test_evento_repetido_nao_duplica() -> None:
    world = World()
    attempt = await world.attempt()
    await world.opened(attempt)
    await world.opened(attempt)
    assert len(world.numbers.items) == 1


@pytest.mark.parametrize(
    ("event", "state"),
    [("connection.update", "connecting"), ("connection.update", None), ("outro", "open")],
)
async def test_outros_eventos_sao_ignorados(event: str, state: str | None) -> None:
    world = World()
    attempt = await world.attempt()
    await world.sync.handle_event(event, attempt.instance_name, state)
    assert attempt.is_pending


async def test_instancia_desconhecida_e_ignorada() -> None:
    world = World()
    await world.sync.handle_event("connection.update", "desconhecida", "open")
    assert world.numbers.items == {}


async def test_instancia_ainda_nao_aberta_nao_conclui() -> None:
    world = World()
    attempt = await world.attempt(jid=None)
    await world.opened(attempt)
    assert attempt.is_pending


async def test_reconexao_usa_o_mesmo_registro() -> None:
    world = World()
    existing = world.number(world.user, PHONE, connected=False)
    attempt = await world.attempt()
    await world.opened(attempt)
    assert list(world.numbers.items) == [existing.id]
    assert existing.is_connected
    assert existing.instance_name == attempt.instance_name


async def test_numero_ja_conectado_na_propria_conta_troca_a_instancia() -> None:
    world = World()
    existing = world.number(world.user, PHONE)
    old = existing.instance_name
    attempt = await world.attempt()
    await world.opened(attempt)
    assert existing.instance_name == attempt.instance_name
    assert old in world.gateway.deleted


async def test_numero_conectado_em_outra_conta_e_recusado() -> None:
    world = World()
    other = world.number(uuid4(), PHONE)
    attempt = await world.attempt()
    await world.opened(attempt)
    assert attempt.status is AttemptStatus.REJECTED
    assert attempt.failure is AttemptFailure.NUMBER_IN_USE
    assert attempt.number_id is None
    assert attempt.instance_name in world.gateway.deleted
    assert other.is_connected


async def test_numero_desconectado_em_outra_conta_pode_ser_conectado() -> None:
    world = World()
    world.number(uuid4(), PHONE, connected=False)
    attempt = await world.attempt()
    await world.opened(attempt)
    assert attempt.status is AttemptStatus.CONNECTED


async def test_limite_e_reavaliado_na_leitura() -> None:
    world = World()
    world.number(world.user, "5511000000001")
    world.number(world.user, "5511000000002")
    attempt = await world.attempt()
    await world.opened(attempt)
    assert attempt.failure is AttemptFailure.LIMIT_REACHED
    assert attempt.instance_name in world.gateway.deleted
    assert len(world.numbers.items) == 2


async def test_reconectar_com_dois_conectados_tambem_e_recusado() -> None:
    world = World()
    world.number(world.user, "5511000000001")
    world.number(world.user, "5511000000002")
    world.number(world.user, PHONE, connected=False)
    attempt = await world.attempt()
    await world.opened(attempt)
    assert attempt.failure is AttemptFailure.LIMIT_REACHED


async def test_recusa_persiste_com_evolution_fora() -> None:
    world = World()
    world.number(uuid4(), PHONE)
    attempt = await world.attempt()
    instance = world.gateway.instances[attempt.instance_name]

    class Offline(FakeWhatsApp):
        async def get_instance(self, name: str):  # type: ignore[no-untyped-def]
            return instance

        async def logout(self, name: str) -> None:
            raise WhatsAppUnavailable()

    world.sync._gateway = Offline()
    await world.opened(attempt)
    assert attempt.status is AttemptStatus.REJECTED


async def test_encerrar_no_celular_desconecta() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    await world.sync.handle_event("logout.instance", str(number.instance_name), None)
    assert number.disconnect_reason is DisconnectReason.PHONE


async def test_close_com_401_desconecta() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    await world.sync.handle_event("connection.update", str(number.instance_name), "close", 401)
    assert not number.is_connected


async def test_erro_515_do_pareamento_nao_desconecta() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    await world.sync.handle_event("connection.update", str(number.instance_name), "close", 515)
    assert number.is_connected


def _instance(world: World, number: WhatsAppNumber, info: InstanceInfo) -> None:
    world.gateway.instances[str(number.instance_name)] = info


async def test_reconciliacao_confirma_numero_aberto() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    _instance(world, number, InstanceInfo("open", JID))
    summary = await world.sync.reconcile()
    assert summary.confirmed == 1
    assert number.last_confirmed_at == world.now


async def test_queda_passageira_nao_desconecta() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    _instance(world, number, InstanceInfo("connecting", None))
    await world.sync.reconcile()
    assert number.is_connected

    world.now += timedelta(seconds=30)
    _instance(world, number, InstanceInfo("open", JID))
    await world.sync.reconcile()
    assert number.is_connected
    assert number.down_since is None


async def test_queda_em_duas_verificacoes_desconecta_em_ate_um_minuto() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    _instance(world, number, InstanceInfo("close", None))
    await world.sync.reconcile()
    world.now += timedelta(seconds=30)
    summary = await world.sync.reconcile()
    assert summary.disconnected == 1
    assert number.disconnect_reason is DisconnectReason.PHONE


async def test_sessao_encerrada_desconecta_na_primeira_verificacao() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    _instance(world, number, InstanceInfo("close", None, 401))
    await world.sync.reconcile()
    assert not number.is_connected


async def test_instancia_sumida_desconecta() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    await world.sync.reconcile()
    assert not number.is_connected


async def test_conexao_de_demonstracao_e_confirmada_sem_consultar_a_evolution() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    number.instance_name = "demo-pitch"
    summary = await world.sync.reconcile()
    assert number.is_connected
    assert summary.confirmed == 1
    assert number.last_confirmed_at == world.now


async def test_desconectar_demonstracao_nao_chama_a_evolution() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    number.instance_name = "demo-pitch"
    number.disconnect(DisconnectReason.OWNER, world.now)
    assert await world.sync.close_number_instance(number)
    assert number.instance_name is None
    assert world.gateway.logged_out == []
    assert world.gateway.deleted == []


async def test_evolution_fora_nao_altera_a_situacao() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    world.gateway.available = False
    summary = await world.sync.reconcile()
    assert not summary.whatsapp_available
    assert number.is_connected
    assert number.down_since is None


async def test_reconciliacao_expira_tentativas_e_remove_a_instancia() -> None:
    world = World()
    attempt = await world.attempt(jid=None)
    world.gateway.instances[attempt.instance_name] = InstanceInfo("connecting", None)
    world.now += timedelta(minutes=5)
    summary = await world.sync.reconcile()
    assert attempt.status is AttemptStatus.EXPIRED
    assert summary.expired == 1
    assert attempt.instance_removed
    assert attempt.instance_name in world.gateway.deleted


async def test_tenta_de_novo_remover_instancia_de_numero_desativado() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    instance = number.instance_name
    number.disconnect(DisconnectReason.ACCOUNT_DEACTIVATED, world.now)
    summary = await world.sync.reconcile()
    assert summary.removed == 1
    assert number.instance_name is None
    assert instance in world.gateway.deleted
    assert (await world.sync.reconcile()).removed == 0


async def test_tentativa_cancelada_em_massa_tem_a_instancia_removida() -> None:
    world = World()
    attempt = await world.attempt()
    attempt.cancel()
    await world.sync.reconcile()
    assert attempt.instance_removed
    assert attempt.instance_name in world.gateway.deleted


async def test_reconciliacao_e_idempotente() -> None:
    world = World()
    number = world.number(world.user, PHONE)
    _instance(world, number, InstanceInfo("open", JID))
    first = await world.sync.reconcile()
    second = await world.sync.reconcile()
    assert first == second
    assert number.is_connected
