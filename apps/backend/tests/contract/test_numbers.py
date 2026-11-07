from uuid import uuid4

import pytest

from tests.conftest import Api, Person
from tests.fakes import FakeWhatsApp

pytestmark = pytest.mark.contract
ATTEMPTS = "/api/v1/channels/whatsapp/attempts"
JID = "5511999999999:3@s.whatsapp.net"
BASE = "/api/v1/connections"


async def _user(api: Api) -> tuple[Person, Person]:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    return admin, await api.member(admin, "user@acme.com")


async def _start(api: Api, person: Person) -> dict[str, str]:
    response = await api.client.post(f"{ATTEMPTS}", headers=person.headers)
    assert response.status_code == 201, response.text
    return response.json()


async def test_conexao_de_ponta_a_ponta(api: Api) -> None:
    _, user = await _user(api)
    response = await api.client.post(f"{ATTEMPTS}", headers=user.headers)
    attempt = response.json()
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    assert attempt["status"] == "pending"
    assert attempt["qr_code"] == FakeWhatsApp.QR
    assert (await api.client.get(BASE, headers=user.headers)).json() == []

    instance = next(iter(api.whatsapp.instances))
    api.whatsapp.scan(instance, JID)
    response = await api.client.get(f"{ATTEMPTS}/{attempt['id']}", headers=user.headers)
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["status"] == "connected"
    assert response.json()["qr_code"] is None

    numbers = (await api.client.get(BASE, headers=user.headers)).json()
    assert [n["account"] for n in numbers] == ["5511999999999"]
    assert numbers[0]["status"] == "connected"
    assert numbers[0]["confirmed"] is True


async def test_admin_da_empresa_tambem_conecta(api: Api) -> None:
    admin, _ = await _user(api)
    assert (await _start(api, admin))["status"] == "pending"


async def test_limite_responde_409(api: Api) -> None:
    _, user = await _user(api)
    for jid in ("5511000000001@s.whatsapp.net", "5511000000002@s.whatsapp.net"):
        attempt = await _start(api, user)
        instance = next(
            i for i in api.whatsapp.instances if api.whatsapp.instances[i].owner_jid is None
        )
        api.whatsapp.scan(instance, jid)
        await api.client.get(f"{ATTEMPTS}/{attempt['id']}", headers=user.headers)
    response = await api.client.post(f"{ATTEMPTS}", headers=user.headers)
    assert response.status_code == 409
    assert response.json()["code"] == "number_limit"


async def test_evolution_fora_responde_503(api: Api) -> None:
    _, user = await _user(api)
    api.whatsapp.available = False
    response = await api.client.post(f"{ATTEMPTS}", headers=user.headers)
    assert response.status_code == 503
    assert response.json()["code"] == "whatsapp_unavailable"


async def test_tentativa_de_outra_pessoa_responde_404(api: Api) -> None:
    admin, user = await _user(api)
    attempt = await _start(api, user)
    for call in (api.client.get, api.client.delete):
        response = await call(f"{ATTEMPTS}/{attempt['id']}", headers=admin.headers)
        assert response.status_code == 404


async def test_tentativa_inexistente_responde_404(api: Api) -> None:
    _, user = await _user(api)
    response = await api.client.get(f"{ATTEMPTS}/{uuid4()}", headers=user.headers)
    assert response.status_code == 404


async def test_cancelar(api: Api) -> None:
    _, user = await _user(api)
    attempt = await _start(api, user)
    response = await api.client.delete(f"{ATTEMPTS}/{attempt['id']}", headers=user.headers)
    assert response.status_code == 204
    state = await api.client.get(f"{ATTEMPTS}/{attempt['id']}", headers=user.headers)
    assert state.json()["status"] == "cancelled"


async def test_resposta_de_numero_em_uso_nao_revela_o_dono(api: Api) -> None:
    admin, user = await _user(api)
    attempt = await _start(api, user)
    api.whatsapp.scan(next(iter(api.whatsapp.instances)), JID)
    await api.client.get(f"{ATTEMPTS}/{attempt['id']}", headers=user.headers)

    other = await _start(api, admin)
    instance = next(
        i for i in api.whatsapp.instances if api.whatsapp.instances[i].owner_jid is None
    )
    api.whatsapp.scan(instance, JID)
    response = await api.client.get(f"{ATTEMPTS}/{other['id']}", headers=admin.headers)

    assert response.json()["status"] == "rejected"
    assert response.json()["failure"] == "number_in_use"
    assert "user@acme.com" not in response.text
