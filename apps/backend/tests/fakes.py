"""Fakes em memória dos ports, para testes sem banco, rede ou framework."""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from app.domain.company import Company
from app.domain.invitation import Invitation, InvitationStatus
from app.domain.password_reset import PasswordReset
from app.domain.session import AuthSession
from app.domain.user import Role, User


class FakeCompanies:
    def __init__(self) -> None:
        self.items: dict[UUID, Company] = {}

    async def add(self, company: Company) -> None:
        self.items[company.id] = company

    async def get(self, company_id: UUID) -> Company | None:
        return self.items.get(company_id)

    get_for_update = get

    async def list_all(self) -> Sequence[Company]:
        return list(self.items.values())

    async def save(self, company: Company) -> None:
        self.items[company.id] = company


class FakeUsers:
    def __init__(self) -> None:
        self.items: dict[UUID, User] = {}

    async def add(self, user: User) -> None:
        self.items[user.id] = user

    async def get(self, user_id: UUID) -> User | None:
        return self.items.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.items.values() if u.email == email), None)

    async def get_in_company(self, company_id: UUID, user_id: UUID) -> User | None:
        user = self.items.get(user_id)
        return user if user and user.company_id == company_id else None

    async def list_by_company(self, company_id: UUID) -> Sequence[User]:
        return [u for u in self.items.values() if u.company_id == company_id]

    async def count_active_admins(self, company_id: UUID) -> int:
        return sum(
            1
            for u in self.items.values()
            if u.company_id == company_id and u.is_active and u.role is Role.COMPANY_ADMIN
        )

    async def save(self, user: User) -> None:
        self.items[user.id] = user


class FakeInvitations:
    def __init__(self) -> None:
        self.items: dict[UUID, Invitation] = {}

    async def add(self, invitation: Invitation) -> None:
        self.items[invitation.id] = invitation

    async def get_by_token_hash(self, token_hash: str) -> Invitation | None:
        return next((i for i in self.items.values() if i.token_hash == token_hash), None)

    async def get_pending_by_email(self, email: str) -> Invitation | None:
        return next(
            (
                i
                for i in self.items.values()
                if i.email == email and i.status is InvitationStatus.PENDING
            ),
            None,
        )

    async def get_in_company(self, company_id: UUID, invitation_id: UUID) -> Invitation | None:
        invitation = self.items.get(invitation_id)
        return invitation if invitation and invitation.company_id == company_id else None

    async def list_pending_by_company(self, company_id: UUID) -> Sequence[Invitation]:
        return [
            i
            for i in self.items.values()
            if i.company_id == company_id and i.status is InvitationStatus.PENDING
        ]

    async def save(self, invitation: Invitation) -> None:
        self.items[invitation.id] = invitation


class FakeSessions:
    def __init__(self, users: FakeUsers | None = None) -> None:
        self.items: dict[UUID, AuthSession] = {}
        self._users = users

    async def add(self, session: AuthSession) -> None:
        self.items[session.id] = session

    async def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        return next((s for s in self.items.values() if s.token_hash == token_hash), None)

    async def save(self, session: AuthSession) -> None:
        self.items[session.id] = session

    async def revoke_for_user(
        self, user_id: UUID, now: datetime, *, except_session: UUID | None = None
    ) -> None:
        for session in self.items.values():
            if session.user_id == user_id and session.id != except_session:
                session.revoke(now)

    async def revoke_for_company(self, company_id: UUID, now: datetime) -> None:
        assert self._users is not None
        members = {u.id for u in await self._users.list_by_company(company_id)}
        for session in self.items.values():
            if session.user_id in members:
                session.revoke(now)


class FakeResets:
    def __init__(self) -> None:
        self.items: dict[UUID, PasswordReset] = {}

    async def add(self, reset: PasswordReset) -> None:
        self.items[reset.id] = reset

    async def get_by_token_hash(self, token_hash: str) -> PasswordReset | None:
        return next((r for r in self.items.values() if r.token_hash == token_hash), None)

    async def save(self, reset: PasswordReset) -> None:
        self.items[reset.id] = reset

    async def invalidate_for_user(self, user_id: UUID, now: datetime) -> None:
        for reset in self.items.values():
            if reset.user_id == user_id and reset.used_at is None:
                reset.used_at = now


class FakeHasher:
    async def hash(self, password: str) -> str:
        return f"hash:{password}"

    async def verify(self, password_hash: str, password: str) -> bool:
        return password_hash == f"hash:{password}"


class FakeTokens:
    def __init__(self) -> None:
        self.count = 0

    def generate(self) -> tuple[str, str]:
        self.count += 1
        token = f"token-{self.count}"
        return token, self.hash(token)

    def hash(self, token: str) -> str:
        return f"sha:{token}"


class FakeThrottle:
    def __init__(self, max_failures: int = 5) -> None:
        self.failures: dict[str, int] = {}
        self.max = max_failures

    async def is_blocked(self, email: str) -> bool:
        return self.failures.get(email, 0) >= self.max

    async def register_failure(self, email: str) -> None:
        self.failures[email] = self.failures.get(email, 0) + 1

    async def reset(self, email: str) -> None:
        self.failures.pop(email, None)


class FakeEmail:
    def __init__(self) -> None:
        self.fail = False
        self.invitations: list[dict[str, str]] = []
        self.resets: list[dict[str, str]] = []

    async def send_invitation(self, *, to: str, company_name: str, url: str) -> None:
        if self.fail:
            raise ConnectionError("smtp fora")
        self.invitations.append({"to": to, "company": company_name, "url": url})

    async def send_password_reset(self, *, to: str, url: str) -> None:
        if self.fail:
            raise ConnectionError("smtp fora")
        self.resets.append({"to": to, "url": url})
