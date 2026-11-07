"""Heartbeat no Redis. A chave é um contrato com o backend (ADR 0007)."""

from datetime import UTC, datetime

from redis.asyncio import Redis

WORKER_HEARTBEAT_KEY = "atentio:workers:heartbeat"


class RedisHeartbeatPublisher:
    def __init__(self, redis: "Redis", ttl_seconds: int) -> None:
        self._redis = redis
        self._ttl = ttl_seconds

    async def beat(self) -> None:
        await self._redis.set(WORKER_HEARTBEAT_KEY, datetime.now(UTC).isoformat(), ex=self._ttl)
