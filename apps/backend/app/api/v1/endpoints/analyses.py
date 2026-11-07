from dataclasses import replace
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, status

from app.api.v1.dependencies import (
    AnalysisServiceDep,
    CompanyAdminDep,
    CompanyMemberDep,
    ContainerDep,
    PromptServiceDep,
    PublishingServiceDep,
    SettingsServiceDep,
)
from app.container import Container
from app.core.logging import get_logger
from app.domain.analysis import Analysis, AnalysisPrompt, AnalysisStatus, UserAiSettings
from app.domain.outputs import OUTPUTS, ProposedItem
from app.repositories.analyses import SqlAnalysisRepository
from app.repositories.messages import SqlMessageRepository
from app.schemas.analyses import (
    AgentStepOut,
    AiSettingsIn,
    AiSettingsOut,
    AnalysisIn,
    AnalysisOut,
    McpSessionOut,
    ModelsOut,
    OutputConnectorOut,
    PresetOut,
    PromptIn,
    PromptOut,
    PublishIn,
    RetentionIn,
    RetentionOut,
)
from app.services.agents import AgentPipeline
from app.services.analyses import AgentJob, AnalysisRequest
from app.services.publishing import PublishDecision

log = get_logger(__name__)

router = APIRouter(prefix="/analyses", tags=["analyses"])
prompts_router = APIRouter(prefix="/analysis-prompts", tags=["analyses"])
models_router = APIRouter(prefix="/analysis-models", tags=["analyses"])
outputs_router = APIRouter(prefix="/output-connectors", tags=["analyses"])
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
        steps=[
            AgentStepOut(
                agent=step.agent.value,
                status=step.status.value,
                model=step.model,
                input=dict(step.input),
                output=dict(step.output),
                started_at=step.started_at,
                finished_at=step.finished_at,
                events=[dict(event) for event in step.events],
                metrics=dict(step.metrics),
            )
            for step in analysis.steps
        ],
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


async def run_agents(container: Container, job: AgentJob) -> None:
    """Roda os agentes fora da requisição; cada etapa é gravada para quem acompanha."""
    async with container.session_factory() as db:
        pipeline = AgentPipeline(
            messages=SqlMessageRepository(db),
            analyses=SqlAnalysisRepository(db),
            model=container.analysis_model,
            clock=container.clock,
            checkpoint=db.commit,
        )
        try:
            await pipeline.execute(job)
        except Exception:
            log.exception("pipeline_de_agentes_falhou")
            await db.rollback()
            repository = SqlAnalysisRepository(db)
            analysis = await repository.get(job.analysis_id)
            if analysis is not None:
                await repository.save(replace(analysis, status=AnalysisStatus.FAILED))
                await db.commit()


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def run_analysis(
    data: AnalysisIn,
    actor: CompanyMemberDep,
    service: AnalysisServiceDep,
    container: ContainerDep,
    background: BackgroundTasks,
) -> AnalysisOut:
    """Começa a análise e responde na hora; o andamento vem em GET /analyses/{id}."""
    request = AnalysisRequest(
        conversation_id=data.conversation_id,
        prompt_id=data.prompt_id,
        prompt_text=data.prompt_text,
        preset=data.preset,
        since=data.since,
        until=data.until,
        message_ids=data.message_ids,
    )
    analysis, job = await service.start(actor, request)
    background.add_task(run_agents, container, job)
    return _analysis(analysis)


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: UUID, actor: CompanyMemberDep, service: AnalysisServiceDep
) -> AnalysisOut:
    return _analysis(await service.get(actor, analysis_id))


@router.post("/{analysis_id}/publish")
async def publish_analysis(
    analysis_id: UUID, data: PublishIn, actor: CompanyMemberDep, service: PublishingServiceDep
) -> AnalysisOut:
    """Revisão humana: aprova (e publica nos conectores de saída) ou descarta."""
    decision = PublishDecision(
        approve=data.approve,
        destinations=data.destinations,
        summary=data.summary,
        items=None
        if data.items is None
        else [ProposedItem(i.title, i.owner, i.due) for i in data.items],
    )
    return _analysis(await service.publish(actor, analysis_id, decision))


@outputs_router.post("/{output_id}/connect")
async def connect_output(
    output_id: str, actor: CompanyMemberDep, service: PublishingServiceDep
) -> McpSessionOut:
    """Conexão simulada: faz o handshake MCP e devolve as ferramentas do destino."""
    session = await service.connect(actor, output_id)
    return McpSessionOut(
        server=session.server, workspace=session.workspace, tools=list(session.tools)
    )


@outputs_router.get("")
async def list_output_connectors(_: CompanyMemberDep) -> list[OutputConnectorOut]:
    return [
        OutputConnectorOut(
            id=o.id, name=o.name, action=o.action, tool=o.tool, status=o.status.value, note=o.note
        )
        for o in OUTPUTS
    ]


@models_router.get("")
async def list_models(actor: CompanyMemberDep, service: AnalysisServiceDep) -> ModelsOut:
    choice = await service.available_models(actor)
    return ModelsOut(
        presets=[
            PresetOut(
                id=option.preset.id,
                label=option.preset.label,
                description=option.preset.description,
                model=option.preset.model,
                input_price=option.price.input_price if option.price else None,
                output_price=option.price.output_price if option.price else None,
            )
            for option in choice.presets
        ],
        default_preset=choice.default_preset,
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
