"""Raiz de composição: cria os recursos compartilhados de um processo."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.database import create_engine, create_session_factory
from app.domain.platform_status import Component
from app.domain.ports import EmailSender, LoginThrottle, PasswordHasher, TokenGenerator
from app.infrastructure.email import SmtpEmailSender
from app.infrastructure.probes.database import DatabaseProbe
from app.infrastructure.probes.http import HttpProbe
from app.infrastructure.probes.redis import RedisProbe, WorkerHeartbeatProbe
from app.infrastructure.security import (
    Argon2PasswordHasher,
    RedisLoginThrottle,
    SecretTokenGenerator,
)
from app.services.platform_status import PlatformStatusService


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass
class Container:
    settings: Settings
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    redis: "Redis"
    http: httpx.AsyncClient
    evolution_http: httpx.AsyncClient
    database_probe: DatabaseProbe
    status_service: PlatformStatusService
    hasher: PasswordHasher
    tokens: TokenGenerator
    throttle: LoginThrottle
    email: EmailSender
    dummy_hash: str
    clock: Callable[[], datetime] = utc_now

    async def close(self) -> None:
        await self.http.aclose()
        await self.evolution_http.aclose()
        await self.redis.aclose()
        await self.engine.dispose()


def build_container(settings: Settings) -> Container:
    engine = create_engine(settings.database_url)
    redis = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    timeout = settings.health_probe_timeout_seconds
    http = httpx.AsyncClient(timeout=timeout)
    # A chave da Evolution API só vai para a Evolution API.
    evolution_http = httpx.AsyncClient(
        timeout=timeout, headers={"apikey": settings.evolution_api_key.get_secret_value()}
    )
    database = DatabaseProbe(engine)
    status_service = PlatformStatusService(
        probes=[
            database,
            RedisProbe(redis),
            WorkerHeartbeatProbe(redis),
            HttpProbe(Component.EVOLUTION_API, settings.evolution_api_url, evolution_http),
            HttpProbe(Component.MCP, f"{settings.mcp_url}/health", http),
        ],
        schema=database,
        timeout_seconds=timeout,
    )
    hasher = Argon2PasswordHasher()
    return Container(
        settings=settings,
        engine=engine,
        session_factory=create_session_factory(engine),
        redis=redis,
        http=http,
        evolution_http=evolution_http,
        database_probe=database,
        status_service=status_service,
        hasher=hasher,
        tokens=SecretTokenGenerator(),
        throttle=RedisLoginThrottle(
            redis, settings.login_max_failures, settings.login_block_minutes * 60
        ),
        email=SmtpEmailSender(settings),
        dummy_hash=hasher.reference_hash(),
    )
