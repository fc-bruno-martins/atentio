from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
import yaml

from app.container import Container
from app.domain.platform_status import Component, ComponentStatus, PlatformStatus
from tests.conftest import Api

pytestmark = pytest.mark.contract

STATUS_CONTRACT = (
    Path(__file__).parents[4] / "specs/001-fundacao-docker/contracts/status.openapi.yaml"
)


async def test_health(client: httpx.AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ready_com_banco_disponivel(client: httpx.AsyncClient) -> None:
    assert (await client.get("/ready")).status_code == 200


async def test_ready_sem_banco_responde_503(
    client: httpx.AsyncClient, container: Container, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        container.database_probe,
        "check",
        AsyncMock(return_value=ComponentStatus.down(Component.DATABASE, "fora")),
    )

    assert (await client.get("/ready")).status_code == 503


def _stub_status() -> PlatformStatus:
    components = tuple(
        ComponentStatus.down(c, "sem heartbeat recente")
        if c is Component.WORKERS
        else ComponentStatus.up(c)
        for c in Component
    )
    return PlatformStatus(components, "0002", datetime(2026, 10, 30, 12, tzinfo=UTC))


async def test_status_mantem_o_contrato_da_001(
    api: Api, container: Container, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = await api.platform_admin()
    monkeypatch.setattr(
        container.status_service, "get_status", AsyncMock(return_value=_stub_status())
    )

    response = await api.client.get("/api/v1/platform/status", headers=root.headers)

    assert response.status_code == 200
    body = response.json()
    schemas = yaml.safe_load(STATUS_CONTRACT.read_text())["components"]["schemas"]
    assert set(body) == set(schemas["PlatformStatus"]["required"])
    assert body["checked_at"] == "2026-10-30T12:00:00Z"
    enum = schemas["ComponentStatus"]["properties"]["component"]["enum"]
    assert [c["component"] for c in body["components"]] == enum
    assert body["components"][4]["detail"] == "sem heartbeat recente"


async def test_falha_inesperada_responde_500_sem_detalhes(
    api: Api, container: Container, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = await api.platform_admin()
    monkeypatch.setattr(
        container.status_service,
        "get_status",
        AsyncMock(side_effect=RuntimeError("postgresql://usuario:senha@db")),
    )

    response = await api.client.get("/api/v1/platform/status", headers=root.headers)

    assert response.status_code == 500
    assert response.json() == {"code": "internal_error", "message": "Internal Server Error"}
