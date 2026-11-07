"""Nenhuma rota de número alcança dado de outra pessoa ou de outra empresa (SC-003)."""

from dataclasses import dataclass

import pytest

from tests.conftest import Api, Person

pytestmark = pytest.mark.contract
ATTEMPTS = "/api/v1/channels/whatsapp/attempts"
NUMBERS = "/api/v1/connections"
COMPANY = "/api/v1/company-connections"


@dataclass
class Scenario:
    admin_a: Person
    user_a: Person
    other_a: Person
    admin_b: Person
    number: dict[str, str]


async def _connect(api: Api, person: Person, jid: str) -> dict[str, str]:
    known = set(api.whatsapp.instances)
    attempt = (await api.client.post(f"{ATTEMPTS}", headers=person.headers)).json()
    instance = next(i for i in api.whatsapp.instances if i not in known)
    api.whatsapp.scan(instance, jid)
    await api.client.get(f"{ATTEMPTS}/{attempt['id']}", headers=person.headers)
    [number] = (await api.client.get(NUMBERS, headers=person.headers)).json()
    return number


async def _scenario(api: Api) -> Scenario:
    root = await api.platform_admin()
    _, admin_a = await api.company(root, "Acme", "admin@acme.com")
    user_a = await api.member(admin_a, "user@acme.com")
    other_a = await api.member(admin_a, "outra@acme.com")
    _, admin_b = await api.company(root, "Beta", "admin@beta.com")
    number = await _connect(api, user_a, "5511999999999@s.whatsapp.net")
    return Scenario(admin_a, user_a, other_a, admin_b, number)


async def test_cada_pessoa_ve_so_os_proprios_numeros(api: Api) -> None:
    scenario = await _scenario(api)
    for person in (scenario.other_a, scenario.admin_a, scenario.admin_b):
        assert (await api.client.get(NUMBERS, headers=person.headers)).json() == []


async def test_outra_pessoa_nao_desconecta_nem_sendo_admin(api: Api) -> None:
    scenario = await _scenario(api)
    url = f"{NUMBERS}/{scenario.number['id']}/disconnect"
    for person in (scenario.other_a, scenario.admin_a, scenario.admin_b):
        assert (await api.client.post(url, headers=person.headers)).status_code == 404


async def test_admin_ve_so_a_propria_empresa(api: Api) -> None:
    scenario = await _scenario(api)
    mine = (await api.client.get(COMPANY, headers=scenario.admin_a.headers)).json()
    assert [(n["account"], n["owner_name"]) for n in mine] == [("5511999999999", "Pessoa Teste")]
    assert (await api.client.get(COMPANY, headers=scenario.admin_b.headers)).json() == []


async def test_admin_de_outra_empresa_recebe_404(api: Api) -> None:
    scenario = await _scenario(api)
    url = f"{COMPANY}/{scenario.number['id']}/disconnect"
    response = await api.client.post(url, headers=scenario.admin_b.headers)
    assert response.status_code == 404
    [number] = (await api.client.get(NUMBERS, headers=scenario.user_a.headers)).json()
    assert number["status"] == "connected"


async def test_usuario_comum_nao_abre_a_visao_da_empresa(api: Api) -> None:
    scenario = await _scenario(api)
    response = await api.client.get(COMPANY, headers=scenario.user_a.headers)
    assert response.status_code == 403
    url = f"{COMPANY}/{scenario.number['id']}/disconnect"
    assert (await api.client.post(url, headers=scenario.user_a.headers)).status_code == 403


async def test_admin_desconecta_e_o_dono_ve(api: Api) -> None:
    scenario = await _scenario(api)
    url = f"{COMPANY}/{scenario.number['id']}/disconnect"
    response = await api.client.post(url, headers=scenario.admin_a.headers)
    assert response.status_code == 200
    assert response.json()["disconnect_reason"] == "company_admin"
    [number] = (await api.client.get(NUMBERS, headers=scenario.user_a.headers)).json()
    assert number["status"] == "disconnected"
    assert number["disconnect_reason"] == "company_admin"


async def test_dono_desconecta(api: Api) -> None:
    scenario = await _scenario(api)
    url = f"{NUMBERS}/{scenario.number['id']}/disconnect"
    response = await api.client.post(url, headers=scenario.user_a.headers)
    assert response.status_code == 200
    assert response.json()["disconnect_reason"] == "owner"


async def test_visao_da_empresa_nao_traz_mensagens(api: Api) -> None:
    scenario = await _scenario(api)
    [number] = (await api.client.get(COMPANY, headers=scenario.admin_a.headers)).json()
    assert set(number) == {
        "id",
        "channel",
        "account",
        "status",
        "status_changed_at",
        "confirmed",
        "disconnect_reason",
        "owner_id",
        "owner_name",
    }


async def test_desativar_usuario_desconecta_pela_api(api: Api) -> None:
    scenario = await _scenario(api)
    await api.client.patch(
        f"/api/v1/users/{scenario.user_a.id}",
        json={"is_active": False},
        headers=scenario.admin_a.headers,
    )
    [number] = (await api.client.get(COMPANY, headers=scenario.admin_a.headers)).json()
    assert number["status"] == "disconnected"
    assert number["disconnect_reason"] == "account_deactivated"


async def test_reconciliacao_em_banco_real_expira_e_remove(api: Api) -> None:
    scenario = await _scenario(api)
    token = {"Authorization": "Bearer token-interno"}
    await api.client.post(
        f"{NUMBERS}/{scenario.number['id']}/disconnect", headers=scenario.user_a.headers
    )
    attempt = (await api.client.post(f"{ATTEMPTS}", headers=scenario.other_a.headers)).json()
    await api.client.patch(
        f"/api/v1/users/{scenario.other_a.id}",
        json={"is_active": False},
        headers=scenario.admin_a.headers,
    )

    response = await api.client.post("/api/v1/internal/numbers/reconcile", headers=token)

    assert response.json()["removed"] == 1
    assert attempt["status"] == "pending"
    assert api.whatsapp.instances == {}
    again = await api.client.post("/api/v1/internal/numbers/reconcile", headers=token)
    assert again.json()["removed"] == 0
