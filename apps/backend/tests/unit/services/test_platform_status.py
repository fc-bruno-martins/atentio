import asyncio
from datetime import UTC, datetime

import pytest

from app.domain.platform_status import Component, ComponentStatus
from app.services.platform_status import PlatformStatusService

pytestmark = pytest.mark.unit
NOW = datetime(2026, 10, 30, 12, tzinfo=UTC)


class FakeProbe:
    def __init__(
        self, component: Component, *, ok: bool = True, delay: float = 0, error: bool = False
    ) -> None:
        self.component = component
        self._ok = ok
        self._delay = delay
        self._error = error

    async def check(self) -> ComponentStatus:
        await asyncio.sleep(self._delay)
        if self._error:
            raise RuntimeError("senha=supersecreta falhou")
        if self._ok:
            return ComponentStatus.up(self.component)
        return ComponentStatus.down(self.component, "fora do ar")


class FakeSchema:
    def __init__(self, error: bool = False) -> None:
        self._error = error

    async def current_version(self) -> str | None:
        if self._error:
            raise RuntimeError("banco fora")
        return "0002"


def _service(*overrides: FakeProbe, schema: FakeSchema | None = None) -> PlatformStatusService:
    probes = {c: FakeProbe(c) for c in Component if c is not Component.BACKEND}
    for probe in overrides:
        probes[probe.component] = probe
    return PlatformStatusService(
        list(probes.values()), schema or FakeSchema(), 0.2, clock=lambda: NOW
    )


async def test_todos_disponiveis() -> None:
    status = await _service().get_status()

    assert status.healthy
    assert status.schema_version == "0002"
    assert status.checked_at == NOW


async def test_um_componente_indisponivel_nao_afeta_os_outros() -> None:
    status = await _service(FakeProbe(Component.WORKERS, ok=False)).get_status()

    down = [c for c in status.components if not c.available]
    assert down == [ComponentStatus.down(Component.WORKERS, "fora do ar")]


async def test_timeout_vira_indisponivel() -> None:
    status = await _service(FakeProbe(Component.MCP, delay=1)).get_status()

    mcp = next(c for c in status.components if c.component is Component.MCP)
    assert mcp == ComponentStatus.down(Component.MCP, "tempo de resposta esgotado")


async def test_excecao_vira_indisponivel_sem_vazar_mensagem() -> None:
    status = await _service(FakeProbe(Component.DATABASE, error=True)).get_status()

    db = next(c for c in status.components if c.component is Component.DATABASE)
    assert db.detail == "erro inesperado (RuntimeError)"


async def test_versao_do_esquema_indisponivel_vira_none() -> None:
    status = await _service(schema=FakeSchema(error=True)).get_status()

    assert status.schema_version is None
