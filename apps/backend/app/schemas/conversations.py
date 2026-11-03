from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ConversationOut(BaseModel):
    id: UUID
    number_id: UUID
    kind: Literal["direct", "group"]
    name: str | None
    contact: str
    last_message_at: datetime


class MessageOut(BaseModel):
    id: UUID
    from_me: bool
    sender_name: str | None
    type: Literal["text", "image", "audio", "video", "document", "sticker", "other"]
    text: str | None
    sent_at: datetime


class ConversationMessagesOut(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOut]
