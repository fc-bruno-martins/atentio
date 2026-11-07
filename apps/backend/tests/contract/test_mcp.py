"""Token do MCP com banco real: alcance, isolamento e perda de acesso."""

import time

import pytest

from tests.conftest import WEBHOOK_SECRET, Api, Person

pytestmark = pytest.mark.contract
TOKENS = "/api/v1/mcp-tokens"
MCP = "/api/v1/mcp"


async def _world(api: Api) -> tuple[Person, Person, Person, str]:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")
    attempt = (
        await api.client.post("/api/v1/channels/whatsapp/attempts", headers=user.headers)
    ).json()
    instance = next(iter(api.whatsapp.instances))
    api.whatsapp.scan(instance, "5511999999999@s.whatsapp.net")
    await api.client.get(
        f"/api/v1/channels/whatsapp/attempts/{attempt['id']}", headers=user.headers
    )
    data = {
        "key": {"remoteJid": "5511@s.whatsapp.net", "fromMe": False, "id": "A"},
        "pushName": "Ana",
        "message": {"conversation": "Reunião 100% confirmada"},
        "messageType": "conversation",
        "messageTimestamp": int(time.time()),
    }
    await api.client.post(
        "/api/v1/internal/webhooks/evolution",
        json={"event": "messages.upsert", "instance": instance, "data": data},
        headers={"x-atentio-secret": WEBHOOK_SECRET},
    )
    created = await api.client.post(TOKENS, json={"name": "Claude"}, headers=user.headers)
    assert created.status_code == 201
    return root, admin, user, created.json()["token"]


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_token_le_os_proprios_dados(api: Api) -> None:
    _, _, _, token = await _world(api)
    [conversation] = (await api.client.get(f"{MCP}/conversations", headers=_bearer(token))).json()
    body = (
        await api.client.get(
            f"{MCP}/conversations/{conversation['id']}/messages", headers=_bearer(token)
        )
    ).json()
    assert body["messages"][0]["text"] == "Reunião 100% confirmada"


async def test_busca_trata_curinga_como_texto(api: Api) -> None:
    _, _, _, token = await _world(api)
    found = await api.client.get(f"{MCP}/search", params={"q": "100%"}, headers=_bearer(token))
    assert len(found.json()) == 1
    missing = await api.client.get(f"{MCP}/search", params={"q": "1%0"}, headers=_bearer(token))
    assert missing.json() == []


async def test_busca_curta_responde_422(api: Api) -> None:
    _, _, _, token = await _world(api)
    response = await api.client.get(f"{MCP}/search", params={"q": "a"}, headers=_bearer(token))
    assert response.status_code == 422


async def test_lista_nao_devolve_o_valor_do_token(api: Api) -> None:
    _, _, user, token = await _world(api)
    response = await api.client.get(TOKENS, headers=user.headers)
    assert token not in response.text
    assert "token" not in response.json()[0]


async def test_outra_pessoa_nao_alcanca_a_conversa(api: Api) -> None:
    _, admin, user, token = await _world(api)
    [conversation] = (await api.client.get(f"{MCP}/conversations", headers=_bearer(token))).json()
    other = (await api.client.post(TOKENS, json={"name": "X"}, headers=admin.headers)).json()
    url = f"{MCP}/conversations/{conversation['id']}/messages"
    assert (await api.client.get(url, headers=_bearer(other["token"]))).status_code == 404
    assert (
        await api.client.get(f"{MCP}/conversations", headers=_bearer(other["token"]))
    ).json() == []
    found = await api.client.get(
        f"{MCP}/search", params={"q": "Reunião"}, headers=_bearer(other["token"])
    )
    assert found.json() == []
    assert (
        await api.client.delete(f"{TOKENS}/{other['id']}", headers=user.headers)
    ).status_code == 404


async def test_rotas_do_mcp_recusam_sessao_e_token_invalido(api: Api) -> None:
    _, _, user, _ = await _world(api)
    for headers in ({}, user.headers, _bearer("invalido")):
        response = await api.client.get(f"{MCP}/conversations", headers=headers)
        assert response.status_code == 401


async def test_token_nao_abre_o_restante_da_api(api: Api) -> None:
    _, _, _, token = await _world(api)
    for path in ("/api/v1/me", "/api/v1/conversations", "/api/v1/analyses", TOKENS):
        assert (await api.client.get(path, headers=_bearer(token))).status_code == 401


async def test_token_revogado_perde_o_acesso(api: Api) -> None:
    _, _, user, token = await _world(api)
    [listed] = (await api.client.get(TOKENS, headers=user.headers)).json()
    assert (
        await api.client.delete(f"{TOKENS}/{listed['id']}", headers=user.headers)
    ).status_code == 204
    assert (await api.client.get(f"{MCP}/conversations", headers=_bearer(token))).status_code == 401
    assert (await api.client.get(TOKENS, headers=user.headers)).json() == []


async def test_conta_desativada_perde_o_acesso(api: Api) -> None:
    _, admin, user, token = await _world(api)
    await api.client.patch(
        f"/api/v1/users/{user.id}", json={"is_active": False}, headers=admin.headers
    )
    assert (await api.client.get(f"{MCP}/conversations", headers=_bearer(token))).status_code == 401


async def test_empresa_desativada_perde_o_acesso(api: Api) -> None:
    root, admin, user, token = await _world(api)
    company = (await api.client.get("/api/v1/me", headers=user.headers)).json()["company"]["id"]
    await api.client.patch(
        f"/api/v1/companies/{company}", json={"is_active": False}, headers=root.headers
    )
    assert (await api.client.get(f"{MCP}/conversations", headers=_bearer(token))).status_code == 401
    assert admin.headers


async def test_uso_fica_registrado(api: Api) -> None:
    _, _, user, token = await _world(api)
    await api.client.get(f"{MCP}/conversations", headers=_bearer(token))
    [listed] = (await api.client.get(TOKENS, headers=user.headers)).json()
    assert listed["last_used_at"] is not None


async def test_nome_invalido_responde_422(api: Api) -> None:
    _, _, user, _ = await _world(api)
    response = await api.client.post(TOKENS, json={"name": "  "}, headers=user.headers)
    assert response.status_code == 422
