from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.v1.dependencies import CompanyAdminDep, CompanyMemberDep, NumberServiceDep
from app.api.v1.endpoints.mappers import attempt_out, company_number_out, number_out
from app.schemas.numbers import AttemptOut, CompanyNumberOut, NumberOut

router = APIRouter(prefix="/numbers", tags=["numbers"])
company_router = APIRouter(prefix="/company-numbers", tags=["numbers"])
NO_STORE = "no-store"


@router.get("")
async def list_numbers(actor: CompanyMemberDep, service: NumberServiceDep) -> list[NumberOut]:
    now = service.now()
    return [number_out(n, now) for n in await service.list_numbers(actor)]


@router.post("/connections", status_code=status.HTTP_201_CREATED)
async def start_connection(
    actor: CompanyMemberDep, service: NumberServiceDep, response: Response
) -> AttemptOut:
    response.headers["Cache-Control"] = NO_STORE
    return attempt_out(await service.start(actor))


@router.get("/connections/{attempt_id}")
async def get_connection(
    attempt_id: UUID, actor: CompanyMemberDep, service: NumberServiceDep, response: Response
) -> AttemptOut:
    response.headers["Cache-Control"] = NO_STORE
    return attempt_out(await service.get(actor, attempt_id))


@router.delete("/connections/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_connection(
    attempt_id: UUID, actor: CompanyMemberDep, service: NumberServiceDep
) -> None:
    await service.cancel(actor, attempt_id)


@router.post("/{number_id}/disconnect")
async def disconnect_number(
    number_id: UUID, actor: CompanyMemberDep, service: NumberServiceDep
) -> NumberOut:
    return number_out(await service.disconnect(actor, number_id), service.now())


@company_router.get("")
async def list_company_numbers(
    actor: CompanyAdminDep, service: NumberServiceDep
) -> list[CompanyNumberOut]:
    now = service.now()
    return [company_number_out(item, now) for item in await service.list_company_numbers(actor)]


@company_router.post("/{number_id}/disconnect")
async def disconnect_company_number(
    number_id: UUID, actor: CompanyAdminDep, service: NumberServiceDep
) -> CompanyNumberOut:
    item = await service.disconnect_in_company(actor, number_id)
    return company_number_out(item, service.now())
