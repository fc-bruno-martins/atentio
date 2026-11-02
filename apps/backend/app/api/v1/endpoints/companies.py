from uuid import UUID

from fastapi import APIRouter, status

from app.api.v1.dependencies import CompanyServiceDep, PlatformAdminDep
from app.api.v1.endpoints.mappers import company_out
from app.schemas.identity import CompanyCreatedOut, CompanyIn, CompanyOut, CompanyUpdateIn

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("")
async def list_companies(_: PlatformAdminDep, service: CompanyServiceDep) -> list[CompanyOut]:
    return [company_out(c) for c in await service.list_all()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyIn, actor: PlatformAdminDep, service: CompanyServiceDep
) -> CompanyCreatedOut:
    created = await service.create(actor, data.name, data.admin_email)
    return CompanyCreatedOut(
        **company_out(created.company).model_dump(),
        invitation_email_failed=created.invitation.last_send_failed_at is not None,
    )


@router.patch("/{company_id}")
async def update_company(
    company_id: UUID,
    data: CompanyUpdateIn,
    _: PlatformAdminDep,
    service: CompanyServiceDep,
) -> CompanyOut:
    return company_out(await service.update(company_id, name=data.name, is_active=data.is_active))
