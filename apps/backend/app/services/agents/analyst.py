"""3. Analista: responde à pergunta usando fatos e conversa."""

from collections.abc import Sequence

from app.domain.agents import Agent
from app.domain.analysis import Analysis, AnalysisStatus, build_completion
from app.domain.errors import AnalysisModelFailed, AnalysisNotConfigured
from app.domain.message import Message
from app.services.agents.context import AgentContext
from app.services.analyses import AgentJob


async def run(
    ctx: AgentContext,
    analysis: Analysis,
    job: AgentJob,
    messages: Sequence[Message],
    facts: str | None,
) -> tuple[Analysis, str | None]:
    """Devolve a resposta em Markdown; `None` quando o provedor falha e a análise termina."""
    step = ctx.step(analysis, Agent.ANALYST).start(
        ctx.clock(),
        pergunta=job.prompt[:500],
        fatos=facts is not None,
        mensagens=len(messages),
    )
    analysis = await ctx.update(analysis, step)
    try:
        analysis, step, completion = await ctx.call(
            analysis,
            step,
            build_completion(
                model=job.model,
                prompt=job.prompt,
                messages=messages,
                settings=job.settings,
                facts=facts,
            ),
        )
    except (AnalysisModelFailed, AnalysisNotConfigured):
        analysis = await ctx.update(
            analysis,
            step.fail(ctx.clock(), "O provedor não respondeu."),
            status=AnalysisStatus.FAILED,
        )
        return analysis, None
    result = completion.text
    step = ctx.handoff(step, Agent.STRUCTURER, f"{len(result.split())} palavras")
    analysis = await ctx.update(
        analysis,
        step.finish(ctx.clock(), palavras=len(result.split()), resposta=result[:400]),
    )
    return analysis, result
