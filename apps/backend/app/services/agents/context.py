"""O que todo agente compartilha: repositórios, modelo, relógio e o registro do rastro."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, replace
from datetime import datetime

from app.domain.agents import Agent, AgentStep
from app.domain.analysis import Analysis, Completion, CompletionRequest
from app.domain.ports import AnalysisModel, AnalysisRepository, MessageRepository

PREVIEW_CHARS = 600


def elapsed_ms(start: datetime | None, end: datetime) -> int:
    return round((end - start).total_seconds() * 1000) if start else 0


@dataclass(frozen=True)
class AgentContext:
    messages: MessageRepository
    analyses: AnalysisRepository
    model: AnalysisModel
    clock: Callable[[], datetime]
    # Torna o progresso visível a quem acompanha (commit fora da requisição).
    checkpoint: Callable[[], Awaitable[None]]

    async def update(self, analysis: Analysis, step: AgentStep, **changes: object) -> Analysis:
        steps = [step if s.agent is step.agent else s for s in analysis.steps]
        updated = replace(analysis, steps=steps, **changes)  # type: ignore[arg-type]
        await self.analyses.save(updated)
        await self.checkpoint()
        return updated

    @staticmethod
    def step(analysis: Analysis, agent: Agent) -> AgentStep:
        return next(s for s in analysis.steps if s.agent is agent)

    async def call(
        self, analysis: Analysis, step: AgentStep, request: CompletionRequest
    ) -> tuple[Analysis, AgentStep, Completion]:
        """Chama o modelo registrando prompt, chamada, resposta, latência e tokens."""
        step = step.log(
            self.clock(),
            "prompt",
            "Prompt montado",
            system=request.system,
            usuario=request.user[:PREVIEW_CHARS],
            caracteres_sistema=len(request.system),
            caracteres_usuario=len(request.user),
        )
        step = step.log(self.clock(), "llm_call", "Chamando o modelo", modelo=request.model)
        analysis = await self.update(analysis, step)
        completion = await self.model.complete(request)
        step = step.measure(
            latencia_ms=completion.latency_ms,
            tokens_entrada=completion.input_tokens,
            tokens_saida=completion.output_tokens,
        ).log(
            self.clock(),
            "llm_response",
            "Resposta do modelo",
            latencia_ms=completion.latency_ms,
            tokens_entrada=completion.input_tokens,
            tokens_saida=completion.output_tokens,
            resposta=completion.text[:PREVIEW_CHARS],
        )
        return analysis, step, completion

    def handoff(self, step: AgentStep, to: Agent, message: str, **data: object) -> AgentStep:
        return step.log(
            self.clock(), "handoff", f"Repassa ao {to.value}: {message}", para=to.value, **data
        )
