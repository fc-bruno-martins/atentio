"""Convites: criação, reenvio, cancelamento e aceite."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from app.core.logging import get_logger
from app.domain.actor import Actor
from app.domain.company import Company
from app.domain.errors import (
    EmailInUse,
    InvalidInvitation,
    InvitationAlreadyPending,
    NotFound,
)
from app.domain.invitation import Invitation
from app.domain.ports import (
    CompanyRepository,
    EmailSender,
    InvitationRepository,
    PasswordHasher,
    TokenGenerator,
    UserRepository,
)
from app.domain.user import Role, User, normalize_email, validate_password

log = get_logger(__name__)


@dataclass(frozen=True)
class InvitationView:
    invitation: Invitation
    company: Company


class InvitationService:
    def __init__(
        self,
        invitations: InvitationRepository,
        users: UserRepository,
        companies: CompanyRepository,
        hasher: PasswordHasher,
        tokens: TokenGenerator,
        email: EmailSender,
        clock: Callable[[], datetime],
        ttl: timedelta,
        public_url: str,
    ) -> None:
        self._invitations = invitations
        self._users = users
        self._companies = companies
        self._hasher = hasher
        self._tokens = tokens
        self._email = email
        self._clock = clock
        self._ttl = ttl
        self._public_url = public_url.rstrip("/")

    async def invite(
        self, *, company: Company, email: str, role: Role, invited_by: UUID
    ) -> Invitation:
        email = normalize_email(email)
        if await self._users.get_by_email(email) is not None:
            raise EmailInUse()
        now = self._clock()
        pending = await self._invitations.get_pending_by_email(email)
        if pending is not None:
            if pending.is_acceptable(now):
                raise InvitationAlreadyPending()
            pending.cancel()
            await self._invitations.save(pending)
        token, token_hash = self._tokens.generate()
        invitation = Invitation.create(
            company_id=company.id,
            email=email,
            role=role,
            token_hash=token_hash,
            now=now,
            ttl=self._ttl,
            invited_by=invited_by,
        )
        await self._invitations.add(invitation)
        await self._deliver(invitation, company, token)
        return invitation

    async def list_pending(self, actor: Actor) -> Sequence[Invitation]:
        return await self._invitations.list_pending_by_company(actor.require_company())

    async def create_for_actor(self, actor: Actor, email: str, role: Role) -> Invitation:
        company = await self._companies.get(actor.require_company())
        if company is None:
            raise NotFound()
        return await self.invite(company=company, email=email, role=role, invited_by=actor.user_id)

    async def resend(self, actor: Actor, invitation_id: UUID) -> Invitation:
        company_id = actor.require_company()
        invitation = await self._invitations.get_in_company(company_id, invitation_id)
        company = await self._companies.get(company_id)
        if invitation is None or company is None:
            raise NotFound()
        token, token_hash = self._tokens.generate()
        invitation.renew(token_hash, self._clock(), self._ttl)
        await self._deliver(invitation, company, token)
        return invitation

    async def cancel(self, actor: Actor, invitation_id: UUID) -> None:
        invitation = await self._invitations.get_in_company(actor.require_company(), invitation_id)
        if invitation is None:
            raise NotFound()
        invitation.cancel()
        await self._invitations.save(invitation)

    async def lookup(self, token: str) -> InvitationView:
        invitation = await self._invitations.get_by_token_hash(self._tokens.hash(token))
        if invitation is None or not invitation.is_acceptable(self._clock()):
            raise InvalidInvitation()
        company = await self._companies.get(invitation.company_id)
        if company is None or not company.is_active:
            raise InvalidInvitation()
        return InvitationView(invitation, company)

    async def accept(self, token: str, name: str, password: str) -> User:
        validate_password(password)
        view = await self.lookup(token)
        invitation = view.invitation
        if await self._users.get_by_email(invitation.email) is not None:
            raise InvalidInvitation()
        user = User.create(
            company_id=invitation.company_id,
            email=invitation.email,
            name=name,
            password_hash=await self._hasher.hash(password),
            role=invitation.role,
        )
        invitation.accept(self._clock())
        await self._users.add(user)
        await self._invitations.save(invitation)
        return user

    async def _deliver(self, invitation: Invitation, company: Company, token: str) -> None:
        """Falha de envio não desfaz o convite: fica registrada para a tela permitir reenvio."""
        try:
            await self._email.send_invitation(
                to=invitation.email,
                company_name=company.name,
                url=f"{self._public_url}/convite?token={token}",
            )
            invitation.record_delivery(failed_at=None)
        except Exception as error:
            log.warning("envio_de_convite_falhou", error=type(error).__name__)
            invitation.record_delivery(failed_at=self._clock())
        await self._invitations.save(invitation)
