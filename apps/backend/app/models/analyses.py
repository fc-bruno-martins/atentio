from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.identity import TimestampMixin


class AnalysisPromptModel(TimestampMixin, Base):
    __tablename__ = "analysis_prompts"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"))
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)


class AnalysisModelRow(TimestampMixin, Base):
    __tablename__ = "analyses"
    __table_args__ = (Index("ix_analyses_owner_created", "owner_user_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True)
    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"))
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    conversation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("conversations.id", ondelete="SET NULL")
    )
    prompt_text: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(10))
    result: Mapped[str | None] = mapped_column(Text)
    message_count: Mapped[int] = mapped_column(Integer)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    steps: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, server_default="[]")


class UserAiSettingsModel(TimestampMixin, Base):
    __tablename__ = "user_ai_settings"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    model: Mapped[str | None] = mapped_column(String(120))
    temperature: Mapped[float | None] = mapped_column(Float)
    extra_prompt: Mapped[str | None] = mapped_column(Text)


class CompanySettingsModel(TimestampMixin, Base):
    __tablename__ = "company_settings"

    company_id: Mapped[UUID] = mapped_column(ForeignKey("companies.id"), primary_key=True)
    retention_days: Mapped[int] = mapped_column(Integer)
