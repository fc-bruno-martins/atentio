"""Empresas, operadas pelo administrador da plataforma."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.actor import Actor
from app.domain.company import Company
from app.domain.errors import NotFound
from app.domain.invitation import Invitation
from app.domain.ports import CompanyRepository, SessionRepository
from app.domain.user import Role
from app.services.invitations import InvitationService


@dataclass(frozen=True)
class CreatedCompany:
    company: Company
    invitation: Invitation


class CompanyService:
    def __init__(
        self,
        companies: CompanyRepository,
        sessions: SessionRepository,
        invitations: InvitationService,
        clock: Callable[[], datetime],
    ) -> None:
        self._companies = companies
        self._sessions = sessions
        self._invitations = invitations
        self._clock = clock

    async def list_all(self) -> Sequence[Company]:
        return await self._companies.list_all()

    async def create(self, actor: Actor, name: str, admin_email: str) -> CreatedCompany:
        company = Company.create(name)
        await self._companies.add(company)
        invitation = await self._invitations.invite(
            company=company,
            email=admin_email,
            role=Role.COMPANY_ADMIN,
            invited_by=actor.user_id,
        )
        return CreatedCompany(company, invitation)

    async def update(
        self, company_id: UUID, *, name: str | None = None, is_active: bool | None = None
    ) -> Company:
        company = await self._companies.get(company_id)
        if company is None:
            raise NotFound()
        if name is not None:
            company.rename(name)
        if is_active is True:
            company.activate()
        if is_active is False:
            company.deactivate()
            await self._sessions.revoke_for_company(company.id, self._clock())
        await self._companies.save(company)
        return company
