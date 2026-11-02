"""Isolamento entre empresas em todas as rotas de empresa (FR-021, SC-004)."""

import pytest

from tests.conftest import Api, Person

pytestmark = pytest.mark.contract


async def _two_companies(api: Api) -> tuple[Person, Person, Person, str]:
    root = await api.platform_admin()
    _, admin_a = await api.company(root, "Empresa A", "admin@a.com")
    _, admin_b = await api.company(root, "Empresa B", "admin@b.com")
    user_b = await api.member(admin_b, "user@b.com")
    pending = await api.client.post(
        "/api/v1/company-invitations",
        json={"email": "pendente@b.com", "role": "user"},
        headers=admin_b.headers,
    )
    return admin_a, admin_b, user_b, pending.json()["id"]


async def test_listagens_mostram_so_a_propria_empresa(api: Api) -> None:
    admin_a, _, _, _ = await _two_companies(api)

    users = await api.client.get("/api/v1/users", headers=admin_a.headers)
    invitations = await api.client.get("/api/v1/company-invitations", headers=admin_a.headers)

    assert [u["email"] for u in users.json()] == ["admin@a.com"]
    assert invitations.json() == []


async def test_escrita_em_usuario_de_outra_empresa_responde_404(api: Api) -> None:
    admin_a, admin_b, user_b, _ = await _two_companies(api)

    response = await api.client.patch(
        f"/api/v1/users/{user_b.id}", json={"is_active": False}, headers=admin_a.headers
    )

    assert response.status_code == 404
    users = await api.client.get("/api/v1/users", headers=admin_b.headers)
    assert all(u["is_active"] for u in users.json())


async def test_convite_de_outra_empresa_responde_404(api: Api) -> None:
    admin_a, admin_b, _, invitation_id = await _two_companies(api)

    resend = await api.client.post(
        f"/api/v1/company-invitations/{invitation_id}/resend", headers=admin_a.headers
    )
    cancel = await api.client.delete(
        f"/api/v1/company-invitations/{invitation_id}", headers=admin_a.headers
    )

    assert resend.status_code == 404
    assert cancel.status_code == 404
    pending = await api.client.get("/api/v1/company-invitations", headers=admin_b.headers)
    assert [i["id"] for i in pending.json()] == [invitation_id]


async def test_corpo_nao_consegue_trocar_a_empresa(api: Api) -> None:
    admin_a, admin_b, _, _ = await _two_companies(api)
    me_b = (await api.client.get("/api/v1/me", headers=admin_b.headers)).json()

    created = await api.client.post(
        "/api/v1/company-invitations",
        json={"email": "x@a.com", "role": "user", "company_id": me_b["company"]["id"]},
        headers=admin_a.headers,
    )

    assert created.status_code == 201
    pending_b = await api.client.get("/api/v1/company-invitations", headers=admin_b.headers)
    assert "x@a.com" not in [i["email"] for i in pending_b.json()]
