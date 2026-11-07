import ast
import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from app.domain.errors import WhatsAppUnavailable
from app.infrastructure import evolution
from app.infrastructure.evolution import EvolutionGateway

pytestmark = pytest.mark.unit
BASE = "http://evolution"


def _gateway(handler: Any) -> EvolutionGateway:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return EvolutionGateway(client, BASE, "http://backend/hook", "segredo")


async def test_cria_instancia_somente_leitura_e_devolve_o_qr() -> None:
    seen: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(json.loads(request.content), path=request.url.path)
        return httpx.Response(201, json={"qrcode": {"base64": "data:image/png;base64,AAA"}})

    qr = await _gateway(handler).create_instance("i")

    assert qr == "data:image/png;base64,AAA"
    assert seen["path"] == "/instance/create"
    for option in ("readMessages", "readStatus", "alwaysOnline", "syncFullHistory"):
        assert seen[option] is False
    assert seen["webhook"]["headers"] == {"x-atentio-secret": "segredo"}


async def test_assina_so_a_chegada_de_mensagens() -> None:
    assert [e for e in evolution.WEBHOOK_EVENTS if "MESSAGE" in e] == ["MESSAGES_UPSERT"]
    assert not [e for e in evolution.WEBHOOK_EVENTS if "SEND" in e]


async def test_habilita_a_captura_sem_nova_instancia() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(201, json={})

    await _gateway(handler).enable_message_events("i")

    assert seen[0].url.path == "/webhook/set/i"
    assert "MESSAGES_UPSERT" in json.loads(seen[0].content)["webhook"]["events"]


async def test_nome_do_grupo() -> None:
    gateway = _gateway(lambda _: httpx.Response(200, json={"subject": "Familia"}))
    assert await gateway.get_group_name("i", "1@g.us") == "Familia"


async def test_grupo_sem_informacao() -> None:
    gateway = _gateway(lambda _: httpx.Response(404, json={}))
    assert await gateway.get_group_name("i", "1@g.us") is None


async def test_le_situacao_e_dono_da_instancia() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["instanceName"] == "i"
        body = [{"connectionStatus": "open", "ownerJid": "5511@s.whatsapp.net"}]
        return httpx.Response(200, json=body)

    info = await _gateway(handler).get_instance("i")

    assert info is not None
    assert info.is_open


async def test_instancia_inexistente() -> None:
    gateway = _gateway(lambda _: httpx.Response(200, json=[]))
    assert await gateway.get_instance("i") is None


async def test_qr_ausente_quando_ja_conectada() -> None:
    gateway = _gateway(lambda _: httpx.Response(200, json={"instance": {"state": "open"}}))
    assert await gateway.get_qr("i") is None


async def test_encerrar_o_que_nao_existe_nao_e_falha() -> None:
    gateway = _gateway(lambda _: httpx.Response(404, json={}))
    await gateway.logout("i")
    await gateway.delete("i")


@pytest.mark.parametrize("status", [401, 500])
async def test_resposta_de_erro_vira_indisponivel(status: int) -> None:
    gateway = _gateway(lambda _: httpx.Response(status, json={}))
    with pytest.raises(WhatsAppUnavailable):
        await gateway.get_qr("i")


async def test_falha_de_rede_vira_indisponivel() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sem rede")

    with pytest.raises(WhatsAppUnavailable):
        await _gateway(handler).create_instance("i")


def test_nenhuma_rota_alcanca_mensagens_ou_conversas() -> None:
    """Somente leitura: o adapter só pode falar com estas rotas."""
    source = Path(evolution.__file__).read_text()
    paths = [
        str(node.value)
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.Constant)
        and isinstance(node.value, str)
        and len(node.value) > 1
        and node.value.startswith("/")
    ]
    assert paths
    allowed = ("/instance/", "/webhook/set/", "/group/findGroupInfos/")
    assert all(path.startswith(allowed) for path in paths)
    for term in ("/message", "/chat", "sendText", "markMessage"):
        assert term not in source
