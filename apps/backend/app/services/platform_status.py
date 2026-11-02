"""Consulta do estado da plataforma."""

import asyncio
from collections.abc import Callable, Sequence
from datetime import UTC, datetime

from app.domain.platform_status import Component, ComponentStatus, PlatformStatus
from app.domain.ports import HealthProbe, SchemaVersionReader


class PlatformStatusService:
    def __init__(
        self,
        probes: Sequence[HealthProbe],
        schema: SchemaVersionReader,
        timeout_seconds: float,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._probes = {p.component: p for p in probes}
        self._schema = schema
        self._timeout = timeout_seconds
        self._clock = clock

    async def get_status(self) -> PlatformStatus:
        checked_at = self._clock()
        results, schema_version = await asyncio.gather(
            asyncio.gather(*(self._check(c) for c in Component)),
            self._schema_version(),
        )
        return PlatformStatus(tuple(results), schema_version, checked_at)

    async def _check(self, component: Component) -> ComponentStatus:
        if component is Component.BACKEND:
            return ComponentStatus.up(component)  # se este código roda, o backend responde
        probe = self._probes.get(component)
        if probe is None:
            return ComponentStatus.down(component, "verificação não configurada")
        try:
            return await asyncio.wait_for(probe.check(), timeout=self._timeout)
        except TimeoutError:
            return ComponentStatus.down(component, "tempo de resposta esgotado")
        except Exception as error:  # nunca expor a mensagem: pode conter credenciais
            return ComponentStatus.down(component, f"erro inesperado ({type(error).__name__})")

    async def _schema_version(self) -> str | None:
        try:
            return await asyncio.wait_for(self._schema.current_version(), self._timeout)
        except Exception:
            return None
