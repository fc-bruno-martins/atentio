from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.conversations import ConversationOut, MessageOut


class ApiTokenIn(BaseModel):
    name: str = Field(max_length=80)


class ApiTokenOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    last_used_at: datetime | None


class ApiTokenCreatedOut(ApiTokenOut):
    token: str


class SearchHitOut(BaseModel):
    conversation: ConversationOut
    message: MessageOut
