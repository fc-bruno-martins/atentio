from uuid import UUID

from fastapi import APIRouter

from app.api.v1.dependencies import CompanyAdminDep, UserAdminServiceDep
from app.api.v1.endpoints.mappers import user_out
from app.domain.user import Role
from app.schemas.identity import UserOut, UserUpdateIn

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def list_users(actor: CompanyAdminDep, service: UserAdminServiceDep) -> list[UserOut]:
    return [user_out(u) for u in await service.list_users(actor)]


@router.patch("/{user_id}")
async def update_user(
    user_id: UUID, data: UserUpdateIn, actor: CompanyAdminDep, service: UserAdminServiceDep
) -> UserOut:
    role = Role(data.role) if data.role else None
    return user_out(await service.update(actor, user_id, role=role, is_active=data.is_active))
