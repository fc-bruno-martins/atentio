"""4. Estruturador: organiza a resposta em seções e conta pendências e decisões."""

from app.domain.agents import Agent, structure
from app.domain.analysis import Analysis, AnalysisStatus
from app.services.agents.context import AgentContext, elapsed_ms


async def run(ctx: AgentContext, analysis: Analysis, result: str) -> Analysis:
    """Conclui a análise com o resultado do analista."""
    step = ctx.step(analysis, Agent.STRUCTURER).start(ctx.clock(), palavras=len(result.split()))
    shaped = structure(result)
    step = step.log(
        ctx.clock(),
        "info",
        "Seções identificadas",
        secoes=len(shaped["secoes"]),
        pendencias=shaped["pendencias"],
        decisoes=shaped["decisoes"],
    )
    step = ctx.handoff(step, Agent.PUBLISHER, f"{shaped['pendencias']} pendências")
    now = ctx.clock()
    step = step.measure(latencia_ms=elapsed_ms(step.started_at, now))
    return await ctx.update(
        analysis,
        step.finish(now, **shaped),
        status=AnalysisStatus.DONE,
        result=result,
    )
