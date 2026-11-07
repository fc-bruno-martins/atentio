from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.identity import TimestampMixin


class ConversationModel(TimestampMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint("kind IN ('direct', 'group')", name="valid_kind"),
        UniqueConstraint("connection_id", "external_ref", name="uq_conversations_connection_ref"),
        Index("ix_conversations_owner_last", "owner_user_id", "last_message_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"))
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    connection_id: Mapped[UUID] = mapped_column(ForeignKey("channel_connections.id"))
    channel: Mapped[str] = mapped_column(String(20), server_default="whatsapp")
    external_ref: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(10))
    name: Mapped[str | None] = mapped_column(String(200))
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MessageModel(TimestampMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint("connection_id", "external_id", name="uq_messages_connection_external"),
        Index("ix_messages_conversation_sent", "conversation_id", "sent_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"))
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    connection_id: Mapped[UUID] = mapped_column(ForeignKey("channel_connections.id"))
    conversation_id: Mapped[UUID] = mapped_column(ForeignKey("conversations.id"))
    external_id: Mapped[str] = mapped_column(String(100))
    from_me: Mapped[bool]
    sender_ref: Mapped[str | None] = mapped_column(String(100))
    sender_name: Mapped[str | None] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(20))
    text: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
