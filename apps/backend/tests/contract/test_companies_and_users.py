from uuid import uuid4

import pytest

from tests.conftest import PASSWORD, Api

pytestmark = pytest.mark.contract


async def test_empresa_e_criada_com_convite_do_primeiro_admin(api: Api) -> None:
    root = await api.platform_admin()

    created = await api.client.post(
        "/api/v1/companies",
        json={"name": "Acme", "admin_email": "admin@acme.com"},
        headers=root.headers,
    )

    assert created.status_code == 201
    assert created.json()["invitation_email_failed"] is False
    assert api.email.invitations[-1]["to"] == "admin@acme.com"
    listed = await api.client.get("/api/v1/companies", headers=root.headers)
    assert [c["name"] for c in listed.json()] == ["Acme"]


async def test_falha_no_envio_e_informada_e_empresa_fica_registrada(api: Api) -> None:
    root = await api.platform_admin()
    api.email.fail = True

    created = await api.client.post(
        "/api/v1/companies",
        json={"name": "Acme", "admin_email": "admin@acme.com"},
        headers=root.headers,
    )

    assert created.status_code == 201
    assert created.json()["invitation_email_failed"] is True


async def test_email_em_uso_desfaz_a_criacao_da_empresa(api: Api) -> None:
    root = await api.platform_admin()

    response = await api.client.post(
        "/api/v1/companies",
        json={"name": "Acme", "admin_email": root.email},
        headers=root.headers,
    )

    assert response.status_code == 409
    assert (await api.client.get("/api/v1/companies", headers=root.headers)).json() == []


async def test_desativar_empresa_derruba_sessoes_e_bloqueia_login(api: Api) -> None:
    root = await api.platform_admin()
    company_id, admin = await api.company(root, "Acme", "admin@acme.com")

    updated = await api.client.patch(
        f"/api/v1/companies/{company_id}", json={"is_active": False}, headers=root.headers
    )

    assert updated.json()["is_active"] is False
    assert (await api.client.get("/api/v1/me", headers=admin.headers)).status_code == 401
    login = await api.client.post(
        "/api/v1/auth/login", json={"email": admin.email, "password": PASSWORD}
    )
    assert login.status_code == 401

    await api.client.patch(
        f"/api/v1/companies/{company_id}", json={"is_active": True}, headers=root.headers
    )
    assert (await api.login(admin.email)).headers


async def test_empresa_inexistente_responde_404(api: Api) -> None:
    root = await api.platform_admin()

    response = await api.client.patch(
        f"/api/v1/companies/{uuid4()}", json={"name": "Nada"}, headers=root.headers
    )

    assert response.status_code == 404


async def test_ciclo_de_convite_de_usuario(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")

    created = await api.client.post(
        "/api/v1/company-invitations",
        json={"email": "novo@acme.com", "role": "user"},
        headers=admin.headers,
    )
    assert created.status_code == 201
    pending = await api.client.get("/api/v1/company-invitations", headers=admin.headers)
    assert [i["email"] for i in pending.json()] == ["novo@acme.com"]

    token = api.last_token()
    preview = await api.client.post("/api/v1/invitations/lookup", json={"token": token})
    assert preview.json() == {"email": "novo@acme.com", "company_name": "Acme"}

    session = await api.accept("Nova Pessoa")
    assert session["user"]["company"]["name"] == "Acme"  # type: ignore[index]
    assert (
        await api.client.post("/api/v1/invitations/lookup", json={"token": token})
    ).status_code == 410
    users = await api.client.get("/api/v1/users", headers=admin.headers)
    assert sorted(u["email"] for u in users.json()) == ["admin@acme.com", "novo@acme.com"]


async def test_reenvio_e_cancelamento(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    created = await api.client.post(
        "/api/v1/company-invitations",
        json={"email": "novo@acme.com", "role": "user"},
        headers=admin.headers,
    )
    invitation_id = created.json()["id"]
    first = api.last_token()

    resent = await api.client.post(
        f"/api/v1/company-invitations/{invitation_id}/resend", headers=admin.headers
    )
    assert resent.status_code == 200
    assert (
        await api.client.post("/api/v1/invitations/lookup", json={"token": first})
    ).status_code == 410

    cancelled = await api.client.delete(
        f"/api/v1/company-invitations/{invitation_id}", headers=admin.headers
    )
    assert cancelled.status_code == 204
    assert (
        await api.client.post("/api/v1/invitations/lookup", json={"token": api.last_token()})
    ).status_code == 410


async def test_convite_duplicado_e_email_em_uso_respondem_409(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    body = {"email": "novo@acme.com", "role": "user"}

    await api.client.post("/api/v1/company-invitations", json=body, headers=admin.headers)
    repeated = await api.client.post(
        "/api/v1/company-invitations", json=body, headers=admin.headers
    )
    existing = await api.client.post(
        "/api/v1/company-invitations",
        json={"email": admin.email, "role": "user"},
        headers=admin.headers,
    )

    assert repeated.status_code == 409
    assert existing.status_code == 409


async def test_convite_recusa_perfil_de_plataforma(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")

    response = await api.client.post(
        "/api/v1/company-invitations",
        json={"email": "x@acme.com", "role": "platform_admin"},
        headers=admin.headers,
    )

    assert response.status_code == 422


async def test_aceite_com_senha_curta_responde_422(api: Api) -> None:
    root = await api.platform_admin()
    await api.client.post(
        "/api/v1/companies",
        json={"name": "Acme", "admin_email": "admin@acme.com"},
        headers=root.headers,
    )

    response = await api.client.post(
        "/api/v1/invitations/accept",
        json={"token": api.last_token(), "name": "Nome", "password": "curta"},
    )

    assert response.status_code == 422


async def test_ultimo_admin_e_protegido_e_desativar_derruba_sessao(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")

    last = await api.client.patch(
        f"/api/v1/users/{admin.id}", json={"is_active": False}, headers=admin.headers
    )
    assert last.status_code == 409
    assert last.json()["code"] == "last_admin"

    disabled = await api.client.patch(
        f"/api/v1/users/{user.id}", json={"is_active": False}, headers=admin.headers
    )
    assert disabled.status_code == 200
    assert (await api.client.get("/api/v1/me", headers=user.headers)).status_code == 401
