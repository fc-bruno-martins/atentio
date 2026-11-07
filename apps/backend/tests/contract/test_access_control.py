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
    ("GET", "/api/v1/company-connections"),
    ("GET", "/api/v1/company-settings"),
    ("PUT", "/api/v1/company-settings"),
    ("GET", "/api/v1/users/{user_id}/ai-settings"),
    ("PUT", "/api/v1/users/{user_id}/ai-settings"),
    ("POST", "/api/v1/company-connections/{connection_id}/disconnect"),
}
COMPANY_MEMBER = {
    ("GET", "/api/v1/channels"),
    ("GET", "/api/v1/connections"),
    ("POST", "/api/v1/channels/whatsapp/attempts"),
    ("GET", "/api/v1/channels/whatsapp/attempts/{attempt_id}"),
    ("DELETE", "/api/v1/channels/whatsapp/attempts/{attempt_id}"),
    ("POST", "/api/v1/connections/{connection_id}/disconnect"),
    ("GET", "/api/v1/conversations"),
    ("GET", "/api/v1/mcp-tokens"),
    ("POST", "/api/v1/mcp-tokens"),
    ("DELETE", "/api/v1/mcp-tokens/{token_id}"),
    ("GET", "/api/v1/analyses"),
    ("GET", "/api/v1/analysis-models"),
    ("POST", "/api/v1/analyses"),
    ("GET", "/api/v1/analyses/{analysis_id}"),
    ("POST", "/api/v1/analyses/{analysis_id}/publish"),
    ("GET", "/api/v1/output-connectors"),
    ("POST", "/api/v1/output-connectors/{output_id}/connect"),
    ("GET", "/api/v1/analysis-prompts"),
    ("POST", "/api/v1/analysis-prompts"),
    ("DELETE", "/api/v1/analysis-prompts/{prompt_id}"),
    ("GET", "/api/v1/conversations/{conversation_id}/messages"),
    ("GET", "/api/v1/overview"),
}
# Protegidas por segredo próprio: ver tests/contract/test_internal.py.
INTERNAL = {
    ("POST", "/api/v1/internal/webhooks/evolution"),
    ("POST", "/api/v1/internal/numbers/reconcile"),
}
# Exigem token do MCP: ver tests/contract/test_mcp.py.
MCP = {
    ("GET", "/api/v1/mcp/conversations"),
    ("GET", "/api/v1/mcp/conversations/{conversation_id}/messages"),
    ("GET", "/api/v1/mcp/search"),
}
PRIVATE = ANY_LOGGED_IN | PLATFORM_ONLY | COMPANY_ADMIN_ONLY | COMPANY_MEMBER


def _routes(app: FastAPI) -> set[tuple[str, str]]:
    return {
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        for method in operations
    }


def _fill(path: str) -> str:
    for name in (
        "company_id",
        "user_id",
        "invitation_id",
        "attempt_id",
        "connection_id",
        "conversation_id",
        "prompt_id",
        "token_id",
        "analysis_id",
        "output_id",
    ):
        path = path.replace(f"{{{name}}}", str(uuid4()))
    return path


def test_toda_rota_esta_classificada(app: FastAPI) -> None:
    assert _routes(app) == PUBLIC | PRIVATE | INTERNAL | MCP


async def test_rotas_privadas_recusam_sem_sessao(api: Api) -> None:
    for method, path in sorted(PRIVATE):
        response = await api.client.request(method, _fill(path), json={})
        assert response.status_code == 401, (method, path, response.status_code)


async def test_rotas_recusam_perfil_incorreto(api: Api) -> None:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")

    denied = [
        (root, COMPANY_ADMIN_ONLY | COMPANY_MEMBER),
        (admin, PLATFORM_ONLY),
        (user, PLATFORM_ONLY | COMPANY_ADMIN_ONLY),
    ]
    for person, routes in denied:
        for method, path in sorted(routes):
            response = await api.client.request(
                method, _fill(path), json={}, headers=person.headers
            )
            assert response.status_code == 403, (person.email, method, path)


async def test_administrador_da_plataforma_nao_alcanca_conversas(api: Api) -> None:
    root = await api.platform_admin()
    for path in ("/api/v1/conversations", f"/api/v1/conversations/{uuid4()}/messages"):
        response = await api.client.get(path, headers=root.headers)
        assert response.status_code == 403
