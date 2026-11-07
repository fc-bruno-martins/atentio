"""Canais e conexões. Cada canal conecta do seu jeito; o WhatsApp usa QR code."""

from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.v1.dependencies import CompanyAdminDep, CompanyMemberDep, NumberServiceDep
from app.api.v1.endpoints.mappers import attempt_out, company_connection_out, connection_out
from app.domain.channel import CHANNELS
from app.schemas.numbers import AttemptOut, ChannelOut, CompanyConnectionOut, ConnectionOut

router = APIRouter(prefix="/connections", tags=["channels"])
channels_router = APIRouter(prefix="/channels", tags=["channels"])
company_router = APIRouter(prefix="/company-connections", tags=["channels"])
NO_STORE = "no-store"


@channels_router.get("")
async def list_channels(_: CompanyMemberDep) -> list[ChannelOut]:
    return [ChannelOut(id=c.id, name=c.name, status=c.status.value) for c in CHANNELS]


@channels_router.post("/whatsapp/attempts", status_code=status.HTTP_201_CREATED)
async def start_whatsapp(
    actor: CompanyMemberDep, service: NumberServiceDep, response: Response
) -> AttemptOut:
    response.headers["Cache-Control"] = NO_STORE
    return attempt_out(await service.start(actor))


@channels_router.get("/whatsapp/attempts/{attempt_id}")
async def get_whatsapp_attempt(
    attempt_id: UUID, actor: CompanyMemberDep, service: NumberServiceDep, response: Response
) -> AttemptOut:
    response.headers["Cache-Control"] = NO_STORE
    return attempt_out(await service.get(actor, attempt_id))


@channels_router.delete("/whatsapp/attempts/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_whatsapp_attempt(
    attempt_id: UUID, actor: CompanyMemberDep, service: NumberServiceDep
) -> None:
    await service.cancel(actor, attempt_id)


@router.get("")
async def list_connections(
    actor: CompanyMemberDep, service: NumberServiceDep
) -> list[ConnectionOut]:
    now = service.now()
    return [connection_out(n, now) for n in await service.list_numbers(actor)]


@router.post("/{connection_id}/disconnect")
async def disconnect(
    connection_id: UUID, actor: CompanyMemberDep, service: NumberServiceDep
) -> ConnectionOut:
    return connection_out(await service.disconnect(actor, connection_id), service.now())


@company_router.get("")
async def list_company_connections(
    actor: CompanyAdminDep, service: NumberServiceDep
) -> list[CompanyConnectionOut]:
    now = service.now()
    return [company_connection_out(item, now) for item in await service.list_company_numbers(actor)]


@company_router.post("/{connection_id}/disconnect")
async def disconnect_company_connection(
    connection_id: UUID, actor: CompanyAdminDep, service: NumberServiceDep
) -> CompanyConnectionOut:
    item = await service.disconnect_in_company(actor, connection_id)
    return company_connection_out(item, service.now())
