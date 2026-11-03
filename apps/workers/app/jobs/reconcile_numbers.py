"""Job que dispara a reconciliação das conexões de WhatsApp."""

import asyncio

from app.core.logging import get_logger
from app.domain.ports import NumberReconciler

log = get_logger(__name__)


class ReconcileNumbersJob:
    def __init__(self, reconciler: NumberReconciler, interval_seconds: float) -> None:
        self._reconciler = reconciler
        self._interval = interval_seconds

    async def run_once(self) -> None:
        try:
            await self._reconciler.reconcile()
        except Exception as error:  # Backend fora não derruba o worker; o próximo ciclo repete
            log.warning("reconciliacao_falhou", error=type(error).__name__)

    async def run(self, stop: asyncio.Event) -> None:
        while not stop.is_set():
            await self.run_once()
            try:
                await asyncio.wait_for(stop.wait(), timeout=self._interval)
            except TimeoutError:
                continue
