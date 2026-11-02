"""Job que mantém o sinal de vida dos workers."""

import asyncio
from pathlib import Path

from app.core.logging import get_logger
from app.domain.ports import HeartbeatPublisher

log = get_logger(__name__)


class HeartbeatJob:
    def __init__(
        self, publisher: HeartbeatPublisher, alive_file: Path, interval_seconds: float
    ) -> None:
        self._publisher = publisher
        self._alive_file = alive_file
        self._interval = interval_seconds

    async def run_once(self) -> None:
        try:
            await self._publisher.beat()
        except Exception as error:  # Redis fora não derruba o worker; o status mostra
            log.warning("heartbeat_falhou", error=type(error).__name__)
        self._alive_file.touch()

    async def run(self, stop: asyncio.Event) -> None:
        log.info("worker_iniciado", interval_seconds=self._interval)
        while not stop.is_set():
            await self.run_once()
            try:
                await asyncio.wait_for(stop.wait(), timeout=self._interval)
            except TimeoutError:
                continue
        log.info("worker_encerrado")
