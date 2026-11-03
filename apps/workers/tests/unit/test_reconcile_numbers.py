import asyncio

import httpx
import pytest

from app.infrastructure.backend_client import BackendNumberReconciler
from app.jobs.reconcile_numbers import ReconcileNumbersJob

pytestmark = pytest.mark.unit


class FakeReconciler:
    def __init__(self, error: Exception | None = None) -> None:
        self.calls = 0
        self.error = error

    async def reconcile(self) -> None:
        self.calls += 1
        if self.error:
            raise self.error


async def test_chama_o_backend_com_o_token() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await BackendNumberReconciler(client, "http://backend/", "token").reconcile()

    assert str(seen[0].url) == "http://backend/api/v1/internal/numbers/reconcile"
    assert seen[0].headers["authorization"] == "Bearer token"


async def test_resposta_de_erro_vira_falha() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(401))
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await BackendNumberReconciler(client, "http://backend", "token").reconcile()


async def test_falha_nao_derruba_o_job() -> None:
    reconciler = FakeReconciler(RuntimeError("backend fora"))
    await ReconcileNumbersJob(reconciler, 30).run_once()
    assert reconciler.calls == 1


async def test_para_com_o_sinal() -> None:
    reconciler = FakeReconciler()
    stop = asyncio.Event()
    stop.set()
    await ReconcileNumbersJob(reconciler, 30).run(stop)
    assert reconciler.calls == 0
