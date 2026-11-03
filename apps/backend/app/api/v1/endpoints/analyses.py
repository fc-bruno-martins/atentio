from uuid import UUID

from fastapi import APIRouter, status

from app.api.v1.dependencies import (
    AnalysisServiceDep,
    CompanyAdminDep,
    CompanyMemberDep,
    PromptServiceDep,
    SettingsServiceDep,
)
from app.domain.analysis import Analysis, AnalysisPrompt, UserAiSettings
from app.schemas.analyses import (
    AiSettingsIn,
    AiSettingsOut,
    AnalysisIn,
    AnalysisOut,
    ModelOptionOut,
    ModelsOut,
    PromptIn,
    PromptOut,
    RetentionIn,
    RetentionOut,
)
from app.services.analyses import AnalysisRequest

router = APIRouter(prefix="/analyses", tags=["analyses"])
prompts_router = APIRouter(prefix="/analysis-prompts", tags=["analyses"])
models_router = APIRouter(prefix="/analysis-models", tags=["analyses"])
settings_router = APIRouter(tags=["settings"])


def _analysis(analysis: Analysis) -> AnalysisOut:
    return AnalysisOut(
        id=analysis.id,
        conversation_id=analysis.conversation_id,
        prompt_text=analysis.prompt_text,
        model=analysis.model,
        status=analysis.status.value,
        result=analysis.result,
        message_count=analysis.message_count,
        created_at=analysis.created_at,
    )


def _prompt(prompt: AnalysisPrompt) -> PromptOut:
    return PromptOut(id=prompt.id, title=prompt.title, body=prompt.body)


def _ai(settings: UserAiSettings) -> AiSettingsOut:
    return AiSettingsOut(
        model=settings.model,
        temperature=settings.temperature,
        extra_prompt=settings.extra_prompt,
    )


@router.get("")
async def list_analyses(actor: CompanyMemberDep, service: AnalysisServiceDep) -> list[AnalysisOut]:
    return [_analysis(a) for a in await service.history(actor)]


@router.post("", status_code=status.HTTP_201_CREATED)
async def run_analysis(
    data: AnalysisIn, actor: CompanyMemberDep, service: AnalysisServiceDep
) -> AnalysisOut:
    request = AnalysisRequest(
        conversation_id=data.conversation_id,
        prompt_id=data.prompt_id,
        prompt_text=data.prompt_text,
        model=data.model,
        since=data.since,
        until=data.until,
        message_ids=data.message_ids,
    )
    return _analysis(await service.run(actor, request))


@models_router.get("")
async def list_models(actor: CompanyMemberDep, service: AnalysisServiceDep) -> ModelsOut:
    choice = await service.available_models(actor)
    return ModelsOut(
        models=[
            ModelOptionOut(
                id=m.id, name=m.name, input_price=m.input_price, output_price=m.output_price
            )
            for m in choice.models
        ],
        default_model=choice.default_model,
    )


@prompts_router.get("")
async def list_prompts(actor: CompanyMemberDep, service: PromptServiceDep) -> list[PromptOut]:
    return [_prompt(p) for p in await service.list_prompts(actor)]


@prompts_router.post("", status_code=status.HTTP_201_CREATED)
async def create_prompt(
    data: PromptIn, actor: CompanyMemberDep, service: PromptServiceDep
) -> PromptOut:
    return _prompt(await service.create(actor, data.title, data.body))


@prompts_router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: UUID, actor: CompanyMemberDep, service: PromptServiceDep
) -> None:
    await service.delete(actor, prompt_id)


@settings_router.get("/company-settings")
async def get_company_settings(actor: CompanyAdminDep, service: SettingsServiceDep) -> RetentionOut:
    return RetentionOut(retention_days=await service.retention(actor))


@settings_router.put("/company-settings")
async def put_company_settings(
    data: RetentionIn, actor: CompanyAdminDep, service: SettingsServiceDep
) -> RetentionOut:
    return RetentionOut(retention_days=await service.set_retention(actor, data.retention_days))


@settings_router.get("/users/{user_id}/ai-settings")
async def get_ai_settings(
    user_id: UUID, actor: CompanyAdminDep, service: SettingsServiceDep
) -> AiSettingsOut:
    return _ai(await service.ai_settings(actor, user_id))


@settings_router.put("/users/{user_id}/ai-settings")
async def put_ai_settings(
    user_id: UUID, data: AiSettingsIn, actor: CompanyAdminDep, service: SettingsServiceDep
) -> AiSettingsOut:
    settings = UserAiSettings(
        user_id,
        (data.model or "").strip() or None,
        data.temperature,
        (data.extra_prompt or "").strip() or None,
    )
    return _ai(await service.set_ai_settings(actor, settings))
