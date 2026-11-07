"""Conversões do domínio para os contratos HTTP."""

from datetime import datetime

from app.domain.company import Company
from app.domain.invitation import Invitation
from app.domain.message import WHATSAPP
from app.domain.number import WhatsAppNumber
from app.domain.user import User
from app.schemas.identity import CompanyOut, CompanyRef, InvitationOut, Me, UserOut
from app.schemas.numbers import AttemptOut, CompanyConnectionOut, ConnectionOut
from app.services.account import Profile
from app.services.numbers import AttemptView, CompanyNumber


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


def connection_out(number: WhatsAppNumber, now: datetime) -> ConnectionOut:
    return ConnectionOut(
        id=number.id,
        channel=WHATSAPP,
        account=number.phone,
        status=number.status.value,
        status_changed_at=number.status_changed_at,
        confirmed=number.is_confirmed(now),
        disconnect_reason=number.disconnect_reason.value if number.disconnect_reason else None,
    )


def company_connection_out(item: CompanyNumber, now: datetime) -> CompanyConnectionOut:
    return CompanyConnectionOut(
        **connection_out(item.number, now).model_dump(),
        owner_id=item.owner.id,
        owner_name=item.owner.name,
    )


def attempt_out(view: AttemptView) -> AttemptOut:
    attempt = view.attempt
    return AttemptOut(
        id=attempt.id,
        status=attempt.status.value,
        qr_code=view.qr_code,
        failure=attempt.failure.value if attempt.failure else None,
        expires_at=attempt.expires_at,
    )
