"""Usuários da empresa, operados pelo admin da empresa."""

from collections.abc import Callable, Sequence
from datetime import datetime
from uuid import UUID

from app.domain.actor import Actor
from app.domain.errors import LastAdmin, NotFound
from app.domain.ports import CompanyRepository, SessionRepository, UserRepository
from app.domain.user import Role, User


class UserAdminService:
    def __init__(
        self,
        users: UserRepository,
        companies: CompanyRepository,
        sessions: SessionRepository,
        clock: Callable[[], datetime],
    ) -> None:
        self._users = users
        self._companies = companies
        self._sessions = sessions
        self._clock = clock

    async def list_users(self, actor: Actor) -> Sequence[User]:
        return await self._users.list_by_company(actor.require_company())

    async def update(
        self,
        actor: Actor,
        user_id: UUID,
        *,
        role: Role | None = None,
        is_active: bool | None = None,
    ) -> User:
        company_id = actor.require_company()
        # A trava da empresa serializa alterações concorrentes da regra do último admin.
        await self._companies.get_for_update(company_id)
        user = await self._users.get_in_company(company_id, user_id)
        if user is None:
            raise NotFound()
        loses_admin = user.is_active_admin and (
            is_active is False or (role is not None and role is not Role.COMPANY_ADMIN)
        )
        if loses_admin and await self._users.count_active_admins(company_id) <= 1:
            raise LastAdmin()
        if role is not None:
            user.change_role(role)
        if is_active is not None:
            user.is_active = is_active
            if not is_active:
                await self._sessions.revoke_for_user(user.id, self._clock())
        await self._users.save(user)
        return user
