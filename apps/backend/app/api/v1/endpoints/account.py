from fastapi import APIRouter, status

from app.api.v1.dependencies import AccountServiceDep, ActorDep
from app.api.v1.endpoints.mappers import me_out
from app.schemas.identity import ChangePasswordIn, Me, UpdateMeIn

router = APIRouter(prefix="/me", tags=["account"])


@router.get("")
async def get_me(actor: ActorDep, account: AccountServiceDep) -> Me:
    return me_out(await account.profile(actor))


@router.patch("")
async def update_me(data: UpdateMeIn, actor: ActorDep, account: AccountServiceDep) -> Me:
    return me_out(await account.rename(actor, data.name))


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: ChangePasswordIn, actor: ActorDep, account: AccountServiceDep
) -> None:
    await account.change_password(actor, data.current_password, data.new_password)
