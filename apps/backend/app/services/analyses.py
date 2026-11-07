"""Análises sob demanda, prompts da pessoa e configurações do admin da empresa."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from app.domain.actor import Actor
from app.domain.agents import (
    DEFAULT_PRESET,
    EXTRACTOR_PRESET,
    PRESETS,
    ModelPreset,
    initial_steps,
    preset_by_id,
)
from app.domain.analysis import (
    MAX_MESSAGES,
    Analysis,
    AnalysisPrompt,
    AnalysisStatus,
    ModelOption,
    UserAiSettings,
    validate_prompt,
    validate_retention,
)
from app.domain.errors import (
    AnalysisNotConfigured,
    InvalidPeriod,
    InvalidValue,
    ModelNotAvailable,
    NoMessagesToAnalyze,
    NotFound,
)
from app.domain.message import Message
from app.domain.ports import (
    AnalysisModel,
    AnalysisRepository,
    MessageRepository,
    PromptRepository,
    SettingsRepository,
    UserRepository,
)


@dataclass(frozen=True)
class AnalysisRequest:
    conversation_id: UUID
    prompt_id: UUID | None = None
    prompt_text: str | None = None
    preset: str | None = None
    since: datetime | None = None
    until: datetime | None = None
    message_ids: Sequence[UUID] = ()


@dataclass(frozen=True)
class PresetOption:
    preset: ModelPreset
    price: ModelOption | None


@dataclass(frozen=True)
class ModelChoice:
    presets: Sequence[PresetOption]
    default_preset: str


@dataclass(frozen=True)
class AgentJob:
    """O que o pipeline de agentes precisa para trabalhar fora da requisição."""

    analysis_id: UUID
    conversation_id: UUID
    message_ids: Sequence[UUID]
    prompt: str
    model: str
    extractor_model: str
    settings: UserAiSettings | None


class AnalysisService:
    def __init__(
        self,
        messages: MessageRepository,
        analyses: AnalysisRepository,
        prompts: PromptRepository,
        settings: SettingsRepository,
        model: AnalysisModel,
        clock: Callable[[], datetime],
        default_model: str | None,
    ) -> None:
        self._messages = messages
        self._analyses = analyses
        self._prompts = prompts
        self._settings = settings
        self._model = model
        self._clock = clock
        self._default_model = default_model

    async def available_models(self, actor: Actor) -> ModelChoice:
        """Só os modelos pré-selecionados, com preço quando o catálogo responde."""
        settings = await self._settings.get_ai_settings(actor.user_id)
        try:
            catalog = {m.id: m for m in await self._model.list_models()}
        except Exception:
            catalog = {}
        chosen = next(
            (p.id for p in PRESETS if settings is not None and p.model == settings.model),
            DEFAULT_PRESET,
        )
        return ModelChoice([PresetOption(p, catalog.get(p.model)) for p in PRESETS], chosen)

    def _resolve_model(self, request: AnalysisRequest, settings: UserAiSettings | None) -> str:
        """Ordem: preset da tela, modelo do admin, padrão do ambiente e preset padrão."""
        if request.preset:
            preset = preset_by_id(request.preset)
            if preset is None:
                raise ModelNotAvailable()
            return preset.model
        if settings and settings.model:
            return settings.model
        if self._default_model:
            return self._default_model
        default = preset_by_id(DEFAULT_PRESET)
        assert default is not None
        return default.model

    async def history(self, actor: Actor) -> Sequence[Analysis]:
        return await self._analyses.list_by_owner(actor.user_id)

    async def get(self, actor: Actor, analysis_id: UUID) -> Analysis:
        analysis = await self._analyses.get_for_owner(actor.user_id, analysis_id)
        if analysis is None:
            raise NotFound()
        return analysis

    async def start(self, actor: Actor, request: AnalysisRequest) -> tuple[Analysis, AgentJob]:
        """Valida tudo, registra a análise em andamento e devolve o trabalho dos agentes."""
        company_id = actor.require_company()
        conversation = await self._messages.get_conversation(actor.user_id, request.conversation_id)
        if conversation is None:
            raise NotFound()
        if not self._model.configured:
            raise AnalysisNotConfigured()
        prompt = await self._resolve_prompt(actor, request)
        messages = await self._select(request)
        if not messages:
            raise NoMessagesToAnalyze()
        settings = await self._settings.get_ai_settings(actor.user_id)
        model = self._resolve_model(request, settings)
        extractor = preset_by_id(EXTRACTOR_PRESET)
        assert extractor is not None
        analysis = Analysis(
            id=uuid4(),
            company_id=company_id,
            owner_user_id=actor.user_id,
            conversation_id=conversation.id,
            prompt_text=prompt,
            model=model,
            status=AnalysisStatus.RUNNING,
            result=None,
            message_count=len(messages),
            created_at=self._clock(),
            steps=initial_steps(model, extractor.model),
        )
        await self._analyses.add(analysis)
        job = AgentJob(
            analysis_id=analysis.id,
            conversation_id=conversation.id,
            message_ids=[m.id for m in messages],
            prompt=prompt,
            model=model,
            extractor_model=extractor.model,
            settings=settings,
        )
        return analysis, job

    async def _resolve_prompt(self, actor: Actor, request: AnalysisRequest) -> str:
        if request.prompt_id is not None:
            saved = await self._prompts.get_for_owner(actor.user_id, request.prompt_id)
            if saved is None:
                raise NotFound()
            return saved.body
        return validate_prompt(request.prompt_text or "")

    async def _select(self, request: AnalysisRequest) -> Sequence[Message]:
        if len(request.message_ids) > MAX_MESSAGES:
            raise InvalidValue(f"Selecione até {MAX_MESSAGES} mensagens.")
        if request.message_ids:
            return await self._messages.list_by_ids(request.conversation_id, request.message_ids)
        if request.since and request.until and request.since >= request.until:
            raise InvalidPeriod()
        return await self._messages.list_messages(
            request.conversation_id,
            since=request.since,
            until=request.until,
            limit=MAX_MESSAGES,
        )


class PromptService:
    def __init__(self, prompts: PromptRepository) -> None:
        self._prompts = prompts

    async def list_prompts(self, actor: Actor) -> Sequence[AnalysisPrompt]:
        return await self._prompts.list_by_owner(actor.user_id)

    async def create(self, actor: Actor, title: str, body: str) -> AnalysisPrompt:
        prompt = AnalysisPrompt.create(
            company_id=actor.require_company(),
            owner_user_id=actor.user_id,
            title=title,
            body=body,
        )
        await self._prompts.add(prompt)
        return prompt

    async def delete(self, actor: Actor, prompt_id: UUID) -> None:
        if await self._prompts.get_for_owner(actor.user_id, prompt_id) is None:
            raise NotFound()
        await self._prompts.delete(prompt_id)


class SettingsService:
    def __init__(
        self,
        settings: SettingsRepository,
        users: UserRepository,
        default_retention_days: int,
    ) -> None:
        self._settings = settings
        self._users = users
        self._default_retention = default_retention_days

    async def retention(self, actor: Actor) -> int:
        days = await self._settings.get_retention_days(actor.require_company())
        return self._default_retention if days is None else days

    async def set_retention(self, actor: Actor, days: int) -> int:
        await self._settings.save_retention_days(actor.require_company(), validate_retention(days))
        return days

    async def _check_user(self, actor: Actor, user_id: UUID) -> None:
        if await self._users.get_in_company(actor.require_company(), user_id) is None:
            raise NotFound()

    async def ai_settings(self, actor: Actor, user_id: UUID) -> UserAiSettings:
        await self._check_user(actor, user_id)
        return await self._settings.get_ai_settings(user_id) or UserAiSettings(user_id)

    async def set_ai_settings(self, actor: Actor, settings: UserAiSettings) -> UserAiSettings:
        await self._check_user(actor, settings.user_id)
        await self._settings.save_ai_settings(settings)
        return settings
