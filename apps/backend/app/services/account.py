"""Conta da própria pessoa e recuperação de senha."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.domain.actor import Actor
from app.domain.company import Company
from app.domain.errors import InvalidResetLink, NotFound, WrongPassword
from app.domain.password_reset import PasswordReset
from app.domain.ports import (
    CompanyRepository,
    PasswordHasher,
    PasswordResetRepository,
    SessionRepository,
    TokenGenerator,
    UserRepository,
)
from app.domain.user import User, normalize_email, validate_password


@dataclass(frozen=True)
class Profile:
    user: User
    company: Company | None


@dataclass(frozen=True)
class RecoveryEmail:
    to: str
    url: str


class AccountService:
    def __init__(
        self,
        users: UserRepository,
        companies: CompanyRepository,
        sessions: SessionRepository,
        hasher: PasswordHasher,
        clock: Callable[[], datetime],
    ) -> None:
        self._users = users
        self._companies = companies
        self._sessions = sessions
        self._hasher = hasher
        self._clock = clock

    async def profile(self, actor: Actor) -> Profile:
        return await self.profile_of(await self._get(actor))

    async def profile_of(self, user: User) -> Profile:
        company = await self._companies.get(user.company_id) if user.company_id else None
        return Profile(user, company)

    async def rename(self, actor: Actor, name: str) -> Profile:
        user = await self._get(actor)
        user.rename(name)
        await self._users.save(user)
        return await self.profile_of(user)

    async def change_password(self, actor: Actor, current: str, new: str) -> None:
        validate_password(new)
        user = await self._get(actor)
        if not await self._hasher.verify(user.password_hash, current):
            raise WrongPassword()
        user.password_hash = await self._hasher.hash(new)
        await self._users.save(user)
        await self._sessions.revoke_for_user(
            user.id, self._clock(), except_session=actor.session_id
        )

    async def _get(self, actor: Actor) -> User:
        user = await self._users.get(actor.user_id)
        if user is None:
            raise NotFound()
        return user


class PasswordRecoveryService:
    def __init__(
        self,
        users: UserRepository,
        companies: CompanyRepository,
        resets: PasswordResetRepository,
        sessions: SessionRepository,
        hasher: PasswordHasher,
        tokens: TokenGenerator,
        clock: Callable[[], datetime],
        ttl: timedelta,
        public_url: str,
    ) -> None:
        self._users = users
        self._companies = companies
        self._resets = resets
        self._sessions = sessions
        self._hasher = hasher
        self._tokens = tokens
        self._clock = clock
        self._ttl = ttl
        self._public_url = public_url.rstrip("/")

    async def request(self, email: str) -> RecoveryEmail | None:
        """Devolve o e-mail a enviar; o endpoint envia depois de responder (FR-024)."""
        user = await self._users.get_by_email(normalize_email(email))
        if user is None or not user.is_active:
            return None
        if user.company_id is not None:
            company = await self._companies.get(user.company_id)
            if company is None or not company.is_active:
                return None
        now = self._clock()
        await self._resets.invalidate_for_user(user.id, now)
        token, token_hash = self._tokens.generate()
        await self._resets.add(
            PasswordReset.create(user_id=user.id, token_hash=token_hash, now=now, ttl=self._ttl)
        )
        return RecoveryEmail(user.email, f"{self._public_url}/redefinir-senha?token={token}")

    async def reset(self, token: str, password: str) -> None:
        validate_password(password)
        reset = await self._resets.get_by_token_hash(self._tokens.hash(token))
        if reset is None:
            raise InvalidResetLink()
        now = self._clock()
        reset.use(now)
        user = await self._users.get(reset.user_id)
        if user is None:
            raise InvalidResetLink()
        user.password_hash = await self._hasher.hash(password)
        await self._users.save(user)
        await self._resets.save(reset)
        await self._sessions.revoke_for_user(user.id, now)
