"""Conversas, com banco real: captura pelo webhook, leitura, isolamento e expurgo."""

import time
from typing import Any

import pytest

from tests.conftest import WEBHOOK_SECRET, Api, Person

pytestmark = pytest.mark.contract
BASE = "/api/v1/conversations"
WEBHOOK = "/api/v1/internal/webhooks/evolution"
TOKEN = {"Authorization": "Bearer token-interno"}


def _data(
    external_id: str, *, age_days: float = 0, jid: str = "5511@s.whatsapp.net"
) -> dict[str, Any]:
    return {
        "key": {"remoteJid": jid, "fromMe": False, "id": external_id},
        "pushName": "Ana",
        "message": {"conversation": f"texto {external_id}"},
        "messageType": "conversation",
        "messageTimestamp": int(time.time() - age_days * 86400),
    }


async def _send(api: Api, instance: str, data: dict[str, Any]) -> None:
    response = await api.client.post(
        WEBHOOK,
        json={"event": "messages.upsert", "instance": instance, "data": data},
        headers={"x-judite-secret": WEBHOOK_SECRET},
    )
    assert response.status_code == 204, response.text


async def _connected(api: Api) -> tuple[Person, Person, Person, Person, str]:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")
    other = await api.member(admin, "outra@acme.com")
    attempt = (await api.client.post("/api/v1/numbers/connections", headers=user.headers)).json()
    instance = next(iter(api.whatsapp.instances))
    api.whatsapp.scan(instance, "5511999999999@s.whatsapp.net")
    await api.client.get(f"/api/v1/numbers/connections/{attempt['id']}", headers=user.headers)
    return root, admin, user, other, instance


async def test_mensagem_capturada_aparece_na_conversa(api: Api) -> None:
    _, _, user, _, instance = await _connected(api)
    await _send(api, instance, _data("A"))
    await _send(api, instance, _data("A"))

    [conversation] = (await api.client.get(BASE, headers=user.headers)).json()
    assert conversation["kind"] == "direct"
    assert conversation["name"] == "Ana"

    body = (
        await api.client.get(f"{BASE}/{conversation['id']}/messages", headers=user.headers)
    ).json()
    assert [m["text"] for m in body["messages"]] == ["texto A"]


async def test_outras_pessoas_nao_alcancam_a_conversa(api: Api) -> None:
    root, admin, user, other, instance = await _connected(api)
    await _send(api, instance, _data("A"))
    [conversation] = (await api.client.get(BASE, headers=user.headers)).json()
    url = f"{BASE}/{conversation['id']}/messages"

    for person in (admin, other):
        assert (await api.client.get(BASE, headers=person.headers)).json() == []
        assert (await api.client.get(url, headers=person.headers)).status_code == 404
    assert (await api.client.get(url, headers=root.headers)).status_code == 403


async def test_filtro_por_periodo(api: Api) -> None:
    _, _, user, _, instance = await _connected(api)
    await _send(api, instance, _data("OLD", age_days=3))
    await _send(api, instance, _data("NEW"))
    [conversation] = (await api.client.get(BASE, headers=user.headers)).json()
    since = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 86400))

    response = await api.client.get(
        f"{BASE}/{conversation['id']}/messages", params={"since": since}, headers=user.headers
    )

    assert [m["text"] for m in response.json()["messages"]] == ["texto NEW"]


async def test_periodo_invertido_responde_422(api: Api) -> None:
    _, _, user, _, instance = await _connected(api)
    await _send(api, instance, _data("A"))
    [conversation] = (await api.client.get(BASE, headers=user.headers)).json()
    response = await api.client.get(
        f"{BASE}/{conversation['id']}/messages",
        params={"since": "2026-11-02T00:00:00Z", "until": "2026-11-01T00:00:00Z"},
        headers=user.headers,
    )
    assert response.status_code == 422


async def test_expurgo_remove_mensagens_e_conversas_vazias(api: Api) -> None:
    _, _, user, _, instance = await _connected(api)
    await _send(api, instance, _data("OLD", age_days=8))

    response = await api.client.post("/api/v1/internal/numbers/reconcile", headers=TOKEN)

    assert response.json()["purged"] == 1
    assert (await api.client.get(BASE, headers=user.headers)).json() == []


async def test_nome_do_grupo_vem_na_reconciliacao(api: Api) -> None:
    _, _, user, _, instance = await _connected(api)
    await _send(api, instance, _data("G", jid="1@g.us"))
    api.whatsapp.group_names["1@g.us"] = "Familia"

    await api.client.post("/api/v1/internal/numbers/reconcile", headers=TOKEN)

    [conversation] = (await api.client.get(BASE, headers=user.headers)).json()
    assert conversation["kind"] == "group"
    assert conversation["name"] == "Familia"
