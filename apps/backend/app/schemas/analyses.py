from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AnalysisIn(BaseModel):
    conversation_id: UUID
    prompt_id: UUID | None = None
    prompt_text: str | None = Field(default=None, max_length=4000)
    preset: str | None = Field(default=None, max_length=40)
    since: datetime | None = None
    until: datetime | None = None
    message_ids: list[UUID] = Field(default_factory=list, max_length=500)


class PresetOut(BaseModel):
    id: str
    label: str
    description: str
    model: str
    input_price: float | None
    output_price: float | None


class ModelsOut(BaseModel):
    presets: list[PresetOut]
    default_preset: str


class AgentStepOut(BaseModel):
    agent: Literal["coletor", "extrator", "analista", "estruturador", "publicador"]
    status: Literal["pending", "running", "done", "failed", "waiting", "skipped"]
    model: str | None
    input: dict[str, Any]
    output: dict[str, Any]
    started_at: datetime | None
    finished_at: datetime | None
    events: list[dict[str, Any]]
    metrics: dict[str, Any]


class AnalysisOut(BaseModel):
    id: UUID
    conversation_id: UUID | None
    prompt_text: str
    model: str
    status: Literal["running", "done", "failed"]
    result: str | None
    message_count: int
    created_at: datetime
    steps: list[AgentStepOut]


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


class PublishItemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    owner: str | None = Field(default=None, max_length=120)
    due: str | None = Field(default=None, max_length=60)


class PublishIn(BaseModel):
    approve: bool
    destinations: list[str] = Field(default_factory=list, max_length=10)
    summary: str | None = Field(default=None, max_length=2000)
    items: list[PublishItemIn] | None = Field(default=None, max_length=30)


class OutputConnectorOut(BaseModel):
    id: str
    name: str
    action: str
    tool: str
    status: Literal["demo", "blocked"]
    note: str | None


class McpSessionOut(BaseModel):
    server: str
    workspace: str
    tools: list[str]
