from typing import Any

import pytest

from app.domain.message import ConversationKind, MessageType
from app.infrastructure.evolution_messages import parse_messages

pytestmark = pytest.mark.unit


def _event(**changes: Any) -> dict[str, Any]:
    event: dict[str, Any] = {
        "key": {"remoteJid": "5511@s.whatsapp.net", "fromMe": False, "id": "A1"},
        "pushName": "Ana",
        "message": {"conversation": "oi"},
        "messageType": "conversation",
        "messageTimestamp": 1793660000,
    }
    return {**event, **changes}


def test_texto_simples() -> None:
    [message] = parse_messages(_event())
    assert message.text == "oi"
    assert message.type is MessageType.TEXT
    assert message.kind is ConversationKind.DIRECT
    assert message.contact_name == "Ana"
    assert message.sent_at.tzinfo is not None


def test_texto_estendido() -> None:
    content = {"extendedTextMessage": {"text": "olá"}}
    [message] = parse_messages(_event(message=content, messageType="extendedTextMessage"))
    assert message.text == "olá"


def test_midia_guarda_tipo_e_legenda_sem_o_arquivo() -> None:
    content = {"imageMessage": {"caption": "foto", "url": "http://x", "jpegThumbnail": "AAA"}}
    [message] = parse_messages(_event(message=content, messageType="imageMessage"))
    assert message.type is MessageType.IMAGE
    assert message.text == "foto"


def test_audio_sem_texto() -> None:
    content = {"audioMessage": {"seconds": 3}}
    [message] = parse_messages(_event(message=content, messageType="audioMessage"))
    assert message.type is MessageType.AUDIO
    assert message.text is None


def test_grupo_guarda_participante_e_nao_vira_nome_da_conversa() -> None:
    key = {"remoteJid": "1@g.us", "fromMe": False, "id": "A", "participant": "55@s.whatsapp.net"}
    [message] = parse_messages(_event(key=key))
    assert message.kind is ConversationKind.GROUP
    assert message.sender_jid == "55@s.whatsapp.net"
    assert message.contact_name is None


def test_mensagem_enviada_nao_nomeia_a_conversa_com_o_dono() -> None:
    key = {"remoteJid": "5511@s.whatsapp.net", "fromMe": True, "id": "A"}
    [message] = parse_messages(_event(key=key, pushName="Eu"))
    assert message.from_me
    assert message.contact_name is None


def test_lid_usa_o_telefone_alternativo() -> None:
    key = {"remoteJid": "9@lid", "remoteJidAlt": "5511@s.whatsapp.net", "id": "A"}
    [message] = parse_messages(_event(key=key))
    assert message.remote_jid == "5511@s.whatsapp.net"


@pytest.mark.parametrize("jid", ["status@broadcast", "1@newsletter"])
def test_status_e_canais_nao_sao_capturados(jid: str) -> None:
    assert parse_messages(_event(key={"remoteJid": jid, "id": "A"})) == []


@pytest.mark.parametrize("kind", ["protocolMessage", "reactionMessage"])
def test_controle_do_protocolo_e_ignorado(kind: str) -> None:
    assert parse_messages(_event(message={kind: {}}, messageType=kind)) == []


@pytest.mark.parametrize(
    "data", [None, {}, {"key": {}}, "x", _event(messageTimestamp="abc"), _event(message=None)]
)
def test_formato_inesperado_e_ignorado(data: Any) -> None:
    assert parse_messages(data) == []


def test_um_item_ruim_nao_derruba_os_demais() -> None:
    assert len(parse_messages([{}, _event()])) == 1
