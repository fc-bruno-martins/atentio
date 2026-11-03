"""Ports dos workers (implementados em infrastructure)."""

from typing import Protocol


class HeartbeatPublisher(Protocol):
    """Sinaliza que os workers estão vivos."""

    async def beat(self) -> None: ...


class NumberReconciler(Protocol):
    """Pede ao backend, dono do esquema, que reconcilie as conexões (ADR 0009)."""

    async def reconcile(self) -> None: ...
