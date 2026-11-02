"""Login, sessões e logout."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.domain.actor import Actor
from app.domain.errors import InvalidCredentials, LoginBlocked, NotAuthenticated
from app.domain.ports import (
    CompanyRepository,
    LoginThrottle,
    PasswordHasher,
    SessionRepository,
    TokenGenerator,
    UserRepository,
)
from app.domain.session import AuthSession
from app.domain.user import User, normalize_email


@dataclass(frozen=True)
class OpenedSession:
    token: str
    session: AuthSession
    user: User


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        companies: CompanyRepository,
        sessions: SessionRepository,
        hasher: PasswordHasher,
        tokens: TokenGenerator,
        throttle: LoginThrottle,
        clock: Callable[[], datetime],
        session_ttl: timedelta,
        dummy_hash: str,
    ) -> None:
        self._users = users
        self._companies = companies
        self._sessions = sessions
        self._hasher = hasher
        self._tokens = tokens
        self._throttle = throttle
        self._clock = clock
        self._ttl = session_ttl
        self._dummy_hash = dummy_hash

    async def login(self, email: str, password: str) -> OpenedSession:
        email = normalize_email(email)
        if await self._throttle.is_blocked(email):
            raise LoginBlocked()
        user = await self._users.get_by_email(email)
        # Conta inexistente também verifica um hash, para reduzir a diferença de tempo.
        password_ok = await self._hasher.verify(
            user.password_hash if user else self._dummy_hash, password
        )
        if user is None or not password_ok or not await self._can_enter(user):
            await self._throttle.register_failure(email)
            raise InvalidCredentials()
        await self._throttle.reset(email)
        return await self.open_session(user)

    async def open_session(self, user: User) -> OpenedSession:
        token, token_hash = self._tokens.generate()
        session = AuthSession.open(
            user_id=user.id, token_hash=token_hash, now=self._clock(), ttl=self._ttl
        )
        await self._sessions.add(session)
        return OpenedSession(token, session, user)

    async def authenticate(self, token: str) -> Actor:
        now = self._clock()
        session = await self._sessions.get_by_token_hash(self._tokens.hash(token))
        if session is None or not session.is_active(now):
            raise NotAuthenticated()
        user = await self._users.get(session.user_id)
        if user is None or not await self._can_enter(user):
            raise NotAuthenticated()
        session.extend(now, self._ttl)
        await self._sessions.save(session)
        return Actor(user.id, session.id, user.role, user.company_id)

    async def logout(self, token: str) -> None:
        session = await self._sessions.get_by_token_hash(self._tokens.hash(token))
        if session is not None:
            session.revoke(self._clock())
            await self._sessions.save(session)

    async def _can_enter(self, user: User) -> bool:
        if not user.is_active:
            return False
        if user.company_id is None:
            return True
        company = await self._companies.get(user.company_id)
        return company is not None and company.is_active
