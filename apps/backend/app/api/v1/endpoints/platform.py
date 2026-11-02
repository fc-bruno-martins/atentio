from fastapi import APIRouter

from app.api.v1.dependencies import PlatformAdminDep, StatusServiceDep
from app.schemas.platform import ComponentStatusOut, PlatformStatusOut

router = APIRouter(prefix="/platform", tags=["platform"])


@router.get("/status")
async def get_status(_: PlatformAdminDep, service: StatusServiceDep) -> PlatformStatusOut:
    status = await service.get_status()
    return PlatformStatusOut(
        healthy=status.healthy,
        schema_version=status.schema_version,
        checked_at=status.checked_at,
        components=[
            ComponentStatusOut(component=c.component, available=c.available, detail=c.detail)
            for c in status.components
        ],
    )
