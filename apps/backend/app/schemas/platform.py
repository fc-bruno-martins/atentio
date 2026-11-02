from datetime import datetime

from pydantic import BaseModel, field_serializer

from app.domain.platform_status import Component


class ComponentStatusOut(BaseModel):
    component: Component
    available: bool
    detail: str | None


class PlatformStatusOut(BaseModel):
    healthy: bool
    schema_version: str | None
    checked_at: datetime
    components: list[ComponentStatusOut]

    @field_serializer("checked_at")
    def _utc_z(self, value: datetime) -> str:
        return value.isoformat().replace("+00:00", "Z")
