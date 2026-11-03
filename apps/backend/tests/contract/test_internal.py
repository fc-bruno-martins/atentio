import pytest

from tests.conftest import WEBHOOK_SECRET, Api

pytestmark = pytest.mark.contract
URL = "/api/v1/internal/webhooks/evolution"
JID = "5511999999999:3@s.whatsapp.net"


def _event(
    instance: str, state: str = "open", event: str = "connection.update"
) -> dict[str, object]:
    return {"event": event, "instance": instance, "data": {"instance": instance, "state": state}}


async def test_webhook_sem_segredo_e_recusado(api: Api) -> None:
    assert (await api.client.post(URL, json=_event("x"))).status_code == 401


async def test_webhook_com_segredo_errado_e_recusado(api: Api) -> None:
    response = await api.client.post(URL, json=_event("x"), headers={"x-judite-secret": "errado"})
    assert response.status_code == 401


async def test_webhook_invalido_responde_422(api: Api) -> None:
    response = await api.client.post(URL, json={}, headers={"x-judite-secret": WEBHOOK_SECRET})
    assert response.status_code == 422


async def test_evento_desconhecido_e_ignorado(api: Api) -> None:
    response = await api.client.post(
        URL,
        json={"event": "outro.evento", "instance": "x", "data": None},
        headers={"x-judite-secret": WEBHOOK_SECRET},
    )
    assert response.status_code == 204


async def test_webhook_conclui_a_conexao(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")
    attempt = (await api.client.post("/api/v1/numbers/connections", headers=user.headers)).json()
    instance = next(iter(api.whatsapp.instances))
    api.whatsapp.scan(instance, JID)

    response = await api.client.post(
        URL, json=_event(instance), headers={"x-judite-secret": WEBHOOK_SECRET}
    )

    assert response.status_code == 204
    state = await api.client.get(
        f"/api/v1/numbers/connections/{attempt['id']}", headers=user.headers
    )
    assert state.json()["status"] == "connected"


RECONCILE = "/api/v1/internal/numbers/reconcile"


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer errado"}])
async def test_reconciliacao_recusa_sem_token(api: Api, headers: dict[str, str]) -> None:
    assert (await api.client.post(RECONCILE, headers=headers)).status_code == 401


async def test_sessao_de_pessoa_nao_abre_a_reconciliacao(api: Api) -> None:
    root = await api.platform_admin()
    assert (await api.client.post(RECONCILE, headers=root.headers)).status_code == 401


async def test_reconciliacao_responde_resumo_sem_dados_pessoais(api: Api) -> None:
    response = await api.client.post(RECONCILE, headers={"Authorization": "Bearer token-interno"})
    assert response.status_code == 200
    assert response.json() == {
        "expired": 0,
        "confirmed": 0,
        "disconnected": 0,
        "removed": 0,
        "purged": 0,
        "whatsapp_available": True,
    }


async def test_webhook_de_logout_desconecta_e_o_dono_ve_o_motivo(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")
    attempt = (await api.client.post("/api/v1/numbers/connections", headers=user.headers)).json()
    instance = next(iter(api.whatsapp.instances))
    api.whatsapp.scan(instance, JID)
    await api.client.get(f"/api/v1/numbers/connections/{attempt['id']}", headers=user.headers)

    await api.client.post(
        URL,
        json={"event": "logout.instance", "instance": instance, "data": None},
        headers={"x-judite-secret": WEBHOOK_SECRET},
    )

    [number] = (await api.client.get("/api/v1/numbers", headers=user.headers)).json()
    assert number["status"] == "disconnected"
    assert number["disconnect_reason"] == "phone"
