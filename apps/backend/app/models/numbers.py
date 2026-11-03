from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.identity import TimestampMixin


class WhatsAppNumberModel(TimestampMixin, Base):
    __tablename__ = "whatsapp_numbers"
    __table_args__ = (
        CheckConstraint("status IN ('connected', 'disconnected')", name="valid_status"),
        UniqueConstraint("owner_user_id", "phone", name="uq_whatsapp_numbers_owner_phone"),
        Index(
            "uq_whatsapp_numbers_connected_phone",
            "phone",
            unique=True,
            postgresql_where=text("status = 'connected'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    phone: Mapped[str] = mapped_column(String(15))
    status: Mapped[str] = mapped_column(String(20))
    status_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    instance_name: Mapped[str | None] = mapped_column(String(60))
    disconnect_reason: Mapped[str | None] = mapped_column(String(30))
    disconnected_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    last_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    down_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    message_events_enabled: Mapped[bool] = mapped_column(server_default=text("false"))


class ConnectionAttemptModel(TimestampMixin, Base):
    __tablename__ = "connection_attempts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'connected', 'rejected', 'expired', 'cancelled')",
            name="valid_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    instance_name: Mapped[str] = mapped_column(String(60), unique=True)
    status: Mapped[str] = mapped_column(String(20))
    failure: Mapped[str | None] = mapped_column(String(30))
    number_id: Mapped[UUID | None] = mapped_column(ForeignKey("whatsapp_numbers.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    instance_removed: Mapped[bool] = mapped_column(server_default=text("false"))
