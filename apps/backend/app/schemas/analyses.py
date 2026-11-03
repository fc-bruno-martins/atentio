from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AnalysisIn(BaseModel):
    conversation_id: UUID
    prompt_id: UUID | None = None
    prompt_text: str | None = Field(default=None, max_length=4000)
    model: str | None = Field(default=None, max_length=120)
    since: datetime | None = None
    until: datetime | None = None
    message_ids: list[UUID] = Field(default_factory=list, max_length=500)


class ModelOptionOut(BaseModel):
    id: str
    name: str
    input_price: float | None
    output_price: float | None


class ModelsOut(BaseModel):
    models: list[ModelOptionOut]
    default_model: str | None


class AnalysisOut(BaseModel):
    id: UUID
    conversation_id: UUID | None
    prompt_text: str
    model: str
    status: Literal["done", "failed"]
    result: str | None
    message_count: int
    created_at: datetime


class PromptIn(BaseModel):
    title: str = Field(max_length=120)
    body: str = Field(max_length=4000)


class PromptOut(BaseModel):
    id: UUID
    title: str
    body: str


class RetentionIn(BaseModel):
    retention_days: int


class RetentionOut(BaseModel):
    retention_days: int


class AiSettingsIn(BaseModel):
    model: str | None = Field(default=None, max_length=120)
    temperature: float | None = None
    extra_prompt: str | None = Field(default=None, max_length=4000)


class AiSettingsOut(AiSettingsIn):
    pass
