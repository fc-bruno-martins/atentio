from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel


class NumberOut(BaseModel):
    id: UUID
    phone: str
    status: Literal["connected", "disconnected"]
    status_changed_at: datetime
    confirmed: bool
    disconnect_reason: str | None


class CompanyNumberOut(NumberOut):
    owner_id: UUID
    owner_name: str


class ReconcileOut(BaseModel):
    expired: int
    confirmed: int
    disconnected: int
    removed: int
    purged: int
    whatsapp_available: bool


class AttemptOut(BaseModel):
    id: UUID
    status: Literal["pending", "connected", "rejected", "expired", "cancelled"]
    qr_code: str | None
    failure: Literal["number_in_use", "limit_reached"] | None
    expires_at: datetime


class EvolutionEvent(BaseModel):
    event: str
    instance: str
    data: dict[str, Any] | list[Any] | None = None
