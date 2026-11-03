import asyncio

import httpx
import pytest
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import create_async_engine

from app.container import Container
from app.domain.platform_status import Component, ComponentStatus
from app.infrastructure.probes.database import DatabaseProbe
from app.infrastructure.probes.http import HttpProbe
from app.infrastructure.probes.redis import WORKER_HEARTBEAT_KEY, RedisProbe, WorkerHeartbeatProbe

pytestmark = pytest.mark.integration


async def test_database_probe(container: Container) -> None:
    probe = DatabaseProbe(container.engine)

    assert await probe.check() == ComponentStatus.up(Component.DATABASE)
    assert await probe.current_version() == "0007"


async def test_database_probe_indisponivel() -> None:
    engine = create_async_engine("postgresql+asyncpg://x:y@127.0.0.1:1/nada")
    status = await DatabaseProbe(engine).check()
    await engine.dispose()

    assert status == ComponentStatus.down(Component.DATABASE, "banco de dados inacessível")


async def test_redis_probe(container: Container) -> None:
    assert await RedisProbe(container.redis).check() == ComponentStatus.up(Component.QUEUE)


async def test_redis_probe_indisponivel() -> None:
    client = Redis.from_url("redis://127.0.0.1:1/0", socket_connect_timeout=0.5)
    status = await RedisProbe(client).check()
    await client.aclose()

    assert status == ComponentStatus.down(Component.QUEUE, "fila inacessível")


async def test_heartbeat_presente_e_expirado(container: Container) -> None:
    redis = container.redis
    probe = WorkerHeartbeatProbe(redis)
    assert not (await probe.check()).available

    await redis.set(WORKER_HEARTBEAT_KEY, "agora", ex=1)
    assert (await probe.check()).available

    await asyncio.sleep(1.2)
    assert (await probe.check()).detail == "sem heartbeat recente"


def _client(status_code: int) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(status_code)))


async def test_http_probe() -> None:
    assert (await HttpProbe(Component.MCP, "http://mcp/", _client(200)).check()).available
    assert (await HttpProbe(Component.MCP, "http://mcp/", _client(503)).check()).detail == (
        "respondeu HTTP 503"
    )


async def test_http_probe_sem_conexao() -> None:
    def fail(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("recusado")

    client = httpx.AsyncClient(transport=httpx.MockTransport(fail))
    status = await HttpProbe(Component.MCP, "http://mcp/", client).check()

    assert status.detail == "serviço inacessível"
