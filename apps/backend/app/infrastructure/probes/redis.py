from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.domain.platform_status import Component, ComponentStatus

# Contrato com o serviço de workers (ADR 0007).
WORKER_HEARTBEAT_KEY = "judite:workers:heartbeat"


class RedisProbe:
    component = Component.QUEUE

    def __init__(self, redis: "Redis") -> None:
        self._redis = redis

    async def check(self) -> ComponentStatus:
        try:
            await self._redis.ping()
        except (RedisError, OSError):
            return ComponentStatus.down(self.component, "fila inacessível")
        return ComponentStatus.up(self.component)


class WorkerHeartbeatProbe:
    """Workers disponíveis se o heartbeat ainda não expirou."""

    component = Component.WORKERS

    def __init__(self, redis: "Redis") -> None:
        self._redis = redis

    async def check(self) -> ComponentStatus:
        try:
            alive = await self._redis.exists(WORKER_HEARTBEAT_KEY)
        except (RedisError, OSError):
            return ComponentStatus.down(self.component, "heartbeat ilegível (fila inacessível)")
        if not alive:
            return ComponentStatus.down(self.component, "sem heartbeat recente")
        return ComponentStatus.up(self.component)
