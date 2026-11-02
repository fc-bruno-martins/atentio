"""Ports dos workers (implementados em infrastructure)."""

from typing import Protocol


class HeartbeatPublisher(Protocol):
    """Sinaliza que os workers estão vivos."""

    async def beat(self) -> None: ...
