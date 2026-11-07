from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.errors import AttemptClosed, InvalidValue
from app.domain.number import (
    AttemptFailure,
    AttemptStatus,
    ConnectionAttempt,
    DisconnectReason,
    InstanceInfo,
    NumberStatus,
    WhatsAppNumber,
    phone_from_jid,
)

pytestmark = pytest.mark.unit
NOW = datetime(2026, 11, 2, 12, tzinfo=UTC)


def _attempt() -> ConnectionAttempt:
    return ConnectionAttempt.start(
        company_id=uuid4(), user_id=uuid4(), now=NOW, ttl=timedelta(minutes=5)
    )


def _number() -> WhatsAppNumber:
    return WhatsAppNumber.connect(
        company_id=uuid4(),
        owner_user_id=uuid4(),
        phone="5511999999999",
        instance_name="i",
        now=NOW,
    )


@pytest.mark.parametrize(
    "jid",
    ["5511999999999@s.whatsapp.net", "5511999999999:12@s.whatsapp.net", "5511999999999"],
)
def test_telefone_vem_do_jid(jid: str) -> None:
    assert phone_from_jid(jid) == "5511999999999"


@pytest.mark.parametrize("jid", ["", "abc@s.whatsapp.net", "123@s.whatsapp.net"])
def test_jid_invalido_e_recusado(jid: str) -> None:
    with pytest.raises(InvalidValue):
        phone_from_jid(jid)


def test_instancia_so_esta_aberta_com_dono_conhecido() -> None:
    assert InstanceInfo("open", "5511@s.whatsapp.net").is_open
    assert not InstanceInfo("open", None).is_open
    assert not InstanceInfo("connecting", "5511@s.whatsapp.net").is_open


def test_nome_da_instancia_nao_leva_dado_pessoal() -> None:
    attempt = _attempt()
    assert attempt.instance_name.startswith("atentio-")
    assert str(attempt.user_id) not in attempt.instance_name


def test_tentativa_expira_no_prazo() -> None:
    attempt = _attempt()
    assert not attempt.has_expired(NOW + timedelta(minutes=4))
    assert attempt.has_expired(NOW + timedelta(minutes=5))


def test_estado_final_nao_muda() -> None:
    attempt = _attempt()
    attempt.complete(uuid4())
    assert attempt.status is AttemptStatus.CONNECTED
    for change in (
        attempt.expire,
        attempt.cancel,
        lambda: attempt.reject(AttemptFailure.NUMBER_IN_USE),
        lambda: attempt.complete(uuid4()),
    ):
        with pytest.raises(AttemptClosed):
            change()


def test_tentativa_recusada_guarda_o_motivo() -> None:
    attempt = _attempt()
    attempt.reject(AttemptFailure.LIMIT_REACHED)
    assert attempt.failure is AttemptFailure.LIMIT_REACHED


def test_situacao_conectada_deixa_de_estar_confirmada_em_2_minutos() -> None:
    number = _number()
    assert number.is_confirmed(NOW + timedelta(minutes=2))
    assert not number.is_confirmed(NOW + timedelta(minutes=2, seconds=1))


def test_numero_desconectado_nao_precisa_de_confirmacao() -> None:
    number = _number()
    number.status = NumberStatus.DISCONNECTED
    assert number.is_confirmed(NOW + timedelta(days=1))


def test_reconexao_mantem_o_registro_e_limpa_a_desconexao() -> None:
    number = _number()
    original = number.id
    number.status = NumberStatus.DISCONNECTED
    later = NOW + timedelta(hours=1)
    number.reconnect("outra", later)
    assert number.id == original
    assert number.is_connected
    assert number.instance_name == "outra"
    assert number.disconnect_reason is None
    assert number.status_changed_at == later


def test_desconectar_guarda_motivo_e_autor() -> None:
    number = _number()
    admin = uuid4()
    later = NOW + timedelta(hours=1)
    number.disconnect(DisconnectReason.COMPANY_ADMIN, later, by=admin)
    assert not number.is_connected
    assert number.disconnect_reason is DisconnectReason.COMPANY_ADMIN
    assert number.disconnected_by == admin
    assert number.status_changed_at == later


def test_desconectar_de_novo_nao_troca_o_motivo() -> None:
    number = _number()
    number.disconnect(DisconnectReason.COMPANY_ADMIN, NOW)
    number.disconnect(DisconnectReason.PHONE, NOW + timedelta(hours=1))
    assert number.disconnect_reason is DisconnectReason.COMPANY_ADMIN
    assert number.status_changed_at == NOW


def test_queda_so_conta_a_partir_da_segunda_verificacao() -> None:
    number = _number()
    assert not number.observe_down(NOW)
    assert not number.observe_down(NOW + timedelta(seconds=24))
    assert number.observe_down(NOW + timedelta(seconds=30))


def test_confirmacao_zera_a_queda() -> None:
    number = _number()
    number.observe_down(NOW)
    number.confirm(NOW + timedelta(seconds=30))
    assert not number.observe_down(NOW + timedelta(seconds=60))


def test_sessao_encerrada_exige_codigo_401_fora_de_open() -> None:
    assert InstanceInfo("close", None, 401).is_logged_out
    assert not InstanceInfo("close", None, 428).is_logged_out
    assert not InstanceInfo("open", "5511@s.whatsapp.net", 401).is_logged_out
