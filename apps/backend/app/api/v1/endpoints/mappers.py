"""Conversões do domínio para os contratos HTTP."""

from app.domain.company import Company
from app.domain.invitation import Invitation
from app.domain.user import User
from app.schemas.identity import CompanyOut, CompanyRef, InvitationOut, Me, UserOut
from app.services.account import Profile


def me_out(profile: Profile) -> Me:
    user, company = profile.user, profile.company
    return Me(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        company=CompanyRef(id=company.id, name=company.name) if company else None,
    )


def company_out(company: Company) -> CompanyOut:
    return CompanyOut(id=company.id, name=company.name, is_active=company.is_active)


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
    )


def invitation_out(invitation: Invitation) -> InvitationOut:
    return InvitationOut(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role.value,
        expires_at=invitation.expires_at,
        email_failed=invitation.last_send_failed_at is not None,
    )
