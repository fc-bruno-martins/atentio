"""Conversas e mensagens capturadas dos números conectados."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

GROUP_SUFFIX = "@g.us"
WHATSAPP = "whatsapp"


class ConversationKind(StrEnum):
    DIRECT = "direct"
    GROUP = "group"


class MessageType(StrEnum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    STICKER = "sticker"
    OTHER = "other"


@dataclass(frozen=True)
class IncomingMessage:
    external_id: str
    remote_jid: str
    from_me: bool
    sender_jid: str | None
    sender_name: str | None
    type: MessageType
    text: str | None
    sent_at: datetime

    @property
    def kind(self) -> ConversationKind:
        if self.remote_jid.endswith(GROUP_SUFFIX):
            return ConversationKind.GROUP
        return ConversationKind.DIRECT

    @property
    def contact_name(self) -> str | None:
        """Em mensagem enviada, o nome informado é o do próprio dono."""
        if self.kind is ConversationKind.DIRECT and not self.from_me:
            return self.sender_name
        return None


@dataclass
class Conversation:
    id: UUID
    number_id: UUID
    remote_jid: str
    kind: ConversationKind
    name: str | None
    last_message_at: datetime
    owner_user_id: UUID
    channel: str = WHATSAPP


@dataclass(frozen=True)
class Message:
    id: UUID
    conversation_id: UUID
    from_me: bool
    sender_name: str | None
    type: MessageType
    text: str | None
    sent_at: datetime


@dataclass(frozen=True)
class SearchHit:
    message: Message
    conversation: Conversation


@dataclass(frozen=True)
class UnnamedGroup:
    conversation_id: UUID
    instance_name: str
    remote_jid: str


@dataclass(frozen=True)
class DayCount:
    day: date
    messages: int


@dataclass(frozen=True)
class ConversationActivity:
    conversation_id: UUID
    messages: int
    last_24h: int


@dataclass(frozen=True)
class Overview:
    """Números da captura da pessoa, para o painel inicial."""

    total_messages: int
    last_24h: int
    from_me: int
    people: int
    by_day: Sequence[DayCount]
    conversations: Sequence[ConversationActivity]
