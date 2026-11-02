from collections.abc import Iterator

import pytest
from redis.asyncio import Redis
from testcontainers.community.redis import RedisContainer

from app.infrastructure.heartbeat import WORKER_HEARTBEAT_KEY, RedisHeartbeatPublisher

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def redis_url() -> Iterator[str]:
    with RedisContainer("redis:7-alpine") as container:
        host = container.get_container_host_ip()
        port = container.get_exposed_port(6379)
        yield f"redis://{host}:{port}/0"


async def test_heartbeat_grava_chave_com_ttl(redis_url: str) -> None:
    redis = Redis.from_url(redis_url)
    await RedisHeartbeatPublisher(redis, ttl_seconds=20).beat()

    assert 0 < await redis.ttl(WORKER_HEARTBEAT_KEY) <= 20
    await redis.aclose()
