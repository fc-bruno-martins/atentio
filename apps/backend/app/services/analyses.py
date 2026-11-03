"""Análises sob demanda, prompts da pessoa e configurações do admin da empresa."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from app.domain.actor import Actor
from app.domain.analysis import (
    MAX_MESSAGES,
    Analysis,
    AnalysisPrompt,
    AnalysisStatus,
    ModelOption,
    UserAiSettings,
    build_completion,
    validate_prompt,
    validate_retention,
)
from app.domain.errors import (
    AnalysisModelFailed,
    InvalidPeriod,
    InvalidValue,
    ModelNotAvailable,
    NoMessagesToAnalyze,
    NoModelSelected,
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
    model: str | None = None
    since: datetime | None = None
    until: datetime | None = None
    message_ids: Sequence[UUID] = ()


@dataclass(frozen=True)
class ModelChoice:
    models: Sequence[ModelOption]
    default_model: str | None


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
        settings = await self._settings.get_ai_settings(actor.user_id)
        default = (settings.model if settings else None) or self._default_model
        return ModelChoice(await self._model.list_models(), default)

    async def _resolve_model(
        self, request: AnalysisRequest, settings: UserAiSettings | None
    ) -> str:
        """A escolha na tela vence a configuração do admin, que vence o padrão do ambiente."""
        if request.model:
            if request.model not in {m.id for m in await self._model.list_models()}:
                raise ModelNotAvailable()
            return request.model
        model = (settings.model if settings else None) or self._default_model
        if model is None:
            raise NoModelSelected()
        return model

    async def history(self, actor: Actor) -> Sequence[Analysis]:
        return await self._analyses.list_by_owner(actor.user_id)

    async def run(self, actor: Actor, request: AnalysisRequest) -> Analysis:
        company_id = actor.require_company()
        conversation = await self._messages.get_conversation(actor.user_id, request.conversation_id)
        if conversation is None:
            raise NotFound()
        prompt = await self._resolve_prompt(actor, request)
        messages = await self._select(request)
        if not messages:
            raise NoMessagesToAnalyze()
        settings = await self._settings.get_ai_settings(actor.user_id)
        model = await self._resolve_model(request, settings)
        completion = build_completion(
            model=model, prompt=prompt, messages=messages, settings=settings
        )
        try:
            result: str | None = await self._model.complete(completion)
            status = AnalysisStatus.DONE
        except AnalysisModelFailed:
            result, status = None, AnalysisStatus.FAILED
        analysis = Analysis(
            id=uuid4(),
            company_id=company_id,
            owner_user_id=actor.user_id,
            conversation_id=conversation.id,
            prompt_text=prompt,
            model=model,
            status=status,
            result=result,
            message_count=len(messages),
            created_at=self._clock(),
        )
        await self._analyses.add(analysis)
        return analysis

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
