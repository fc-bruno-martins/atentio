"""Adapters de senha, tokens e bloqueio de login."""

import asyncio
import hashlib
import secrets

from argon2 import PasswordHasher as Argon2
from argon2.exceptions import InvalidHashError, VerificationError
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.logging import get_logger

log = get_logger(__name__)


class Argon2PasswordHasher:
    def __init__(self) -> None:
        self._argon2 = Argon2()

    def reference_hash(self) -> str:
        """Hash usado para igualar o tempo do login quando a conta não existe."""
        return self._argon2.hash(secrets.token_urlsafe(16))

    async def hash(self, password: str) -> str:
        return await asyncio.to_thread(self._argon2.hash, password)

    async def verify(self, password_hash: str, password: str) -> bool:
        try:
            return await asyncio.to_thread(self._argon2.verify, password_hash, password)
        except (VerificationError, InvalidHashError):
            return False


class SecretTokenGenerator:
    def generate(self) -> tuple[str, str]:
        token = secrets.token_urlsafe(32)
        return token, self.hash(token)

    def hash(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()


class RedisLoginThrottle:
    """Com o Redis fora, o login continua funcionando e registra aviso."""

    def __init__(self, redis: "Redis", max_failures: int, block_seconds: int) -> None:
        self._redis = redis
        self._max = max_failures
        self._block = block_seconds

    def _key(self, email: str) -> str:
        return f"atentio:auth:failures:{hashlib.sha256(email.encode()).hexdigest()}"

    async def is_blocked(self, email: str) -> bool:
        try:
            value = await self._redis.get(self._key(email))
        except (RedisError, OSError):
            log.warning("bloqueio_de_login_indisponivel")
            return False
        return value is not None and int(value) >= self._max

    async def register_failure(self, email: str) -> None:
        try:
            key = self._key(email)
            failures = await self._redis.incr(key)
            # O prazo recomeça ao atingir o limite: o bloqueio dura o período inteiro (FR-003).
            if failures == 1 or failures >= self._max:
                await self._redis.expire(key, self._block)
        except (RedisError, OSError):
            log.warning("bloqueio_de_login_indisponivel")

    async def reset(self, email: str) -> None:
        try:
            await self._redis.delete(self._key(email))
        except (RedisError, OSError):
            log.warning("bloqueio_de_login_indisponivel")
