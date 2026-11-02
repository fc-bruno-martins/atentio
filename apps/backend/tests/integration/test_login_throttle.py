import pytest
from redis.asyncio import Redis

from app.infrastructure.security import RedisLoginThrottle

pytestmark = pytest.mark.integration
EMAIL = "pessoa@acme.com"


@pytest.fixture
async def redis(redis_url: str):  # type: ignore[no-untyped-def]
    client = Redis.from_url(redis_url)
    await client.flushdb()
    yield client
    await client.aclose()


async def test_bloqueio_dura_o_prazo_inteiro_a_partir_da_ultima_falha(redis: Redis) -> None:
    throttle = RedisLoginThrottle(redis, max_failures=5, block_seconds=900)
    key = throttle._key(EMAIL)
    for _ in range(4):
        await throttle.register_failure(EMAIL)
    # Simula a quinta falha chegando quase no fim da janela iniciada pela primeira.
    await redis.expire(key, 60)
    assert not await throttle.is_blocked(EMAIL)

    await throttle.register_failure(EMAIL)

    assert await throttle.is_blocked(EMAIL)
    assert await redis.ttl(key) > 890


async def test_falhas_abaixo_do_limite_expiram_e_nao_bloqueiam(redis: Redis) -> None:
    throttle = RedisLoginThrottle(redis, max_failures=5, block_seconds=900)
    await throttle.register_failure(EMAIL)
    assert 0 < await redis.ttl(throttle._key(EMAIL)) <= 900
    assert not await throttle.is_blocked(EMAIL)


async def test_login_com_sucesso_zera_as_falhas(redis: Redis) -> None:
    throttle = RedisLoginThrottle(redis, max_failures=5, block_seconds=900)
    for _ in range(5):
        await throttle.register_failure(EMAIL)
    await throttle.reset(EMAIL)
    assert not await throttle.is_blocked(EMAIL)
