from uuid import UUID

from fastapi import APIRouter, status

from app.api.v1.dependencies import (
    AccountServiceDep,
    AuthServiceDep,
    CompanyAdminDep,
    InvitationServiceDep,
)
from app.api.v1.endpoints.mappers import invitation_out, me_out
from app.domain.user import Role
from app.schemas.identity import (
    InvitationAcceptIn,
    InvitationIn,
    InvitationOut,
    InvitationPreviewOut,
    InvitationTokenIn,
    SessionOut,
)

router = APIRouter(tags=["invitations"])


@router.get("/company-invitations")
async def list_invitations(
    actor: CompanyAdminDep, service: InvitationServiceDep
) -> list[InvitationOut]:
    return [invitation_out(i) for i in await service.list_pending(actor)]


@router.post("/company-invitations", status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: InvitationIn, actor: CompanyAdminDep, service: InvitationServiceDep
) -> InvitationOut:
    return invitation_out(await service.create_for_actor(actor, data.email, Role(data.role)))


@router.post("/company-invitations/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: UUID, actor: CompanyAdminDep, service: InvitationServiceDep
) -> InvitationOut:
    return invitation_out(await service.resend(actor, invitation_id))


@router.delete("/company-invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: UUID, actor: CompanyAdminDep, service: InvitationServiceDep
) -> None:
    await service.cancel(actor, invitation_id)


@router.post("/invitations/lookup")
async def lookup_invitation(
    data: InvitationTokenIn, service: InvitationServiceDep
) -> InvitationPreviewOut:
    view = await service.lookup(data.token)
    return InvitationPreviewOut(email=view.invitation.email, company_name=view.company.name)


@router.post("/invitations/accept")
async def accept_invitation(
    data: InvitationAcceptIn,
    service: InvitationServiceDep,
    auth: AuthServiceDep,
    account: AccountServiceDep,
) -> SessionOut:
    user = await service.accept(data.token, data.name, data.password)
    opened = await auth.open_session(user)
    profile = await account.profile_of(user)
    return SessionOut(
        token=opened.token, expires_at=opened.session.expires_at, user=me_out(profile)
    )
