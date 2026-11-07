from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ConversationOut(BaseModel):
    id: UUID
    connection_id: UUID
    channel: str
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


class DayCountOut(BaseModel):
    day: date
    messages: int


class ConversationActivityOut(BaseModel):
    conversation_id: UUID
    messages: int
    last_24h: int


class OverviewOut(BaseModel):
    total_messages: int
    last_24h: int
    from_me: int
    people: int
    by_day: list[DayCountOut]
    conversations: list[ConversationActivityOut]
