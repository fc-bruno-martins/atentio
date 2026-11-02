from unittest.mock import AsyncMock

import pytest
from redis.exceptions import ConnectionError as RedisConnectionError

from app.container import Container
from tests.conftest import PASSWORD, Api

pytestmark = pytest.mark.contract
LOGIN = "/api/v1/auth/login"


async def test_login_me_e_logout_com_bearer(api: Api) -> None:
    root = await api.platform_admin()

    me = await api.client.get("/api/v1/me", headers=root.headers)
    assert me.status_code == 200
    assert me.json()["role"] == "platform_admin"
    assert me.json()["company"] is None

    assert (await api.client.post("/api/v1/auth/logout", headers=root.headers)).status_code == 204
    assert (await api.client.get("/api/v1/me", headers=root.headers)).status_code == 401


async def test_sessao_criada_vale_na_chamada_seguinte(api: Api) -> None:
    root = await api.platform_admin()

    for _ in range(3):
        assert (await api.client.get("/api/v1/me", headers=root.headers)).status_code == 200


async def test_senha_errada_e_email_inexistente_respondem_igual(api: Api) -> None:
    await api.platform_admin()

    wrong = await api.client.post(LOGIN, json={"email": "root@judite.com", "password": "x"})
    unknown = await api.client.post(LOGIN, json={"email": "nao@judite.com", "password": "x"})

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


async def test_login_invalido_retorna_422(api: Api) -> None:
    assert (await api.client.post(LOGIN, json={"email": "x"})).status_code == 422


async def test_bloqueio_apos_cinco_falhas(api: Api) -> None:
    await api.platform_admin()
    body = {"email": "root@judite.com", "password": "errada"}
    for _ in range(5):
        assert (await api.client.post(LOGIN, json=body)).status_code == 401

    blocked = await api.client.post(LOGIN, json={"email": "root@judite.com", "password": PASSWORD})

    assert blocked.status_code == 429


async def test_login_funciona_com_redis_fora(
    api: Api, container: Container, monkeypatch: pytest.MonkeyPatch
) -> None:
    await api.platform_admin()
    monkeypatch.setattr(container.redis, "get", AsyncMock(side_effect=RedisConnectionError()))
    monkeypatch.setattr(container.redis, "delete", AsyncMock(side_effect=RedisConnectionError()))

    assert (await api.login("root@judite.com")).headers


async def test_token_invalido_responde_401(api: Api) -> None:
    response = await api.client.get("/api/v1/me", headers={"Authorization": "Bearer invalido"})

    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


async def test_recuperacao_responde_igual_e_envia_so_para_conta_existente(api: Api) -> None:
    await api.platform_admin()

    known = await api.client.post(
        "/api/v1/auth/password-recovery", json={"email": "root@judite.com"}
    )
    unknown = await api.client.post(
        "/api/v1/auth/password-recovery", json={"email": "nao@judite.com"}
    )

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert [e["to"] for e in api.email.resets] == ["root@judite.com"]


async def test_falha_de_envio_na_recuperacao_nao_muda_a_resposta(api: Api) -> None:
    await api.platform_admin()
    api.email.fail = True

    response = await api.client.post(
        "/api/v1/auth/password-recovery", json={"email": "root@judite.com"}
    )

    assert response.status_code == 202


async def test_redefinir_senha_encerra_sessoes(api: Api) -> None:
    root = await api.platform_admin()
    await api.client.post("/api/v1/auth/password-recovery", json={"email": root.email})
    token = api.email.resets[-1]["url"].split("token=")[1]
    new = "outra-senha-muito-boa"

    response = await api.client.post(
        "/api/v1/auth/password-reset", json={"token": token, "password": new}
    )

    assert response.status_code == 204
    assert (await api.client.get("/api/v1/me", headers=root.headers)).status_code == 401
    assert (await api.login(root.email, new)).headers
    repeated = await api.client.post(
        "/api/v1/auth/password-reset", json={"token": token, "password": new}
    )
    assert repeated.status_code == 400


async def test_alterar_nome_e_senha(api: Api) -> None:
    root = await api.platform_admin()

    renamed = await api.client.patch("/api/v1/me", json={"name": "Novo Nome"}, headers=root.headers)
    assert renamed.json()["name"] == "Novo Nome"
    invalid = await api.client.patch("/api/v1/me", json={"name": "x"}, headers=root.headers)
    assert invalid.status_code == 422

    wrong = await api.client.put(
        "/api/v1/me/password",
        json={"current_password": "errada", "new_password": "outra-senha-boa"},
        headers=root.headers,
    )
    assert wrong.status_code == 400
    ok = await api.client.put(
        "/api/v1/me/password",
        json={"current_password": PASSWORD, "new_password": "outra-senha-boa"},
        headers=root.headers,
    )
    assert ok.status_code == 204
