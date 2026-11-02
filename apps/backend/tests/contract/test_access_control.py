"""Varre todas as rotas: nenhuma rota privada pode faltar nesta verificação (SC-003)."""

from uuid import uuid4

import pytest
from fastapi import FastAPI

from tests.conftest import Api

pytestmark = pytest.mark.contract

PUBLIC = {
    ("GET", "/health"),
    ("GET", "/ready"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/password-recovery"),
    ("POST", "/api/v1/auth/password-reset"),
    ("POST", "/api/v1/invitations/lookup"),
    ("POST", "/api/v1/invitations/accept"),
}
ANY_LOGGED_IN = {
    ("POST", "/api/v1/auth/logout"),
    ("GET", "/api/v1/me"),
    ("PATCH", "/api/v1/me"),
    ("PUT", "/api/v1/me/password"),
}
PLATFORM_ONLY = {
    ("GET", "/api/v1/companies"),
    ("POST", "/api/v1/companies"),
    ("PATCH", "/api/v1/companies/{company_id}"),
    ("GET", "/api/v1/platform/status"),
}
COMPANY_ADMIN_ONLY = {
    ("GET", "/api/v1/users"),
    ("PATCH", "/api/v1/users/{user_id}"),
    ("GET", "/api/v1/company-invitations"),
    ("POST", "/api/v1/company-invitations"),
    ("POST", "/api/v1/company-invitations/{invitation_id}/resend"),
    ("DELETE", "/api/v1/company-invitations/{invitation_id}"),
}


def _routes(app: FastAPI) -> set[tuple[str, str]]:
    return {
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        for method in operations
    }


def _fill(path: str) -> str:
    for name in ("company_id", "user_id", "invitation_id"):
        path = path.replace(f"{{{name}}}", str(uuid4()))
    return path


def test_toda_rota_esta_classificada(app: FastAPI) -> None:
    assert _routes(app) == PUBLIC | ANY_LOGGED_IN | PLATFORM_ONLY | COMPANY_ADMIN_ONLY


async def test_rotas_privadas_recusam_sem_sessao(api: Api) -> None:
    for method, path in sorted(ANY_LOGGED_IN | PLATFORM_ONLY | COMPANY_ADMIN_ONLY):
        response = await api.client.request(method, _fill(path), json={})
        assert response.status_code == 401, (method, path, response.status_code)


async def test_rotas_recusam_perfil_incorreto(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")

    denied = [
        (root, COMPANY_ADMIN_ONLY),
        (admin, PLATFORM_ONLY),
        (user, PLATFORM_ONLY | COMPANY_ADMIN_ONLY),
    ]
    for person, routes in denied:
        for method, path in sorted(routes):
            response = await api.client.request(
                method, _fill(path), json={}, headers=person.headers
            )
            assert response.status_code == 403, (person.email, method, path)


def test_administrador_da_plataforma_nao_tem_rota_de_conversas(app: FastAPI) -> None:
    paths = " ".join(path for _, path in _routes(app))

    assert "message" not in paths
    assert "conversation" not in paths
