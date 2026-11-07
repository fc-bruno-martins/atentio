"""1. Coletor: busca as mensagens do recorte e resume o que encontrou."""

from collections.abc import Sequence

from app.domain.agents import Agent, collect_summary
from app.domain.analysis import Analysis
from app.domain.message import Message
from app.services.agents.context import AgentContext, elapsed_ms
from app.services.analyses import AgentJob


async def run(
    ctx: AgentContext, analysis: Analysis, job: AgentJob
) -> tuple[Analysis, Sequence[Message]]:
    step = ctx.step(analysis, Agent.COLLECTOR).start(
        ctx.clock(), conversa=str(job.conversation_id), recorte=len(job.message_ids)
    )
    step = step.log(ctx.clock(), "query", "Consultando o banco de mensagens")
    analysis = await ctx.update(analysis, step)
    messages = await ctx.messages.list_by_ids(job.conversation_id, job.message_ids)
    summary = collect_summary(messages)
    step = step.log(
        ctx.clock(),
        "info",
        "Mensagens carregadas e resumidas",
        mensagens=len(messages),
        participantes=len(summary["participantes"]),
    )
    step = ctx.handoff(step, Agent.EXTRACTOR, f"{len(messages)} mensagens")
    now = ctx.clock()
    step = step.measure(latencia_ms=elapsed_ms(step.started_at, now)).finish(now, **summary)
    return await ctx.update(analysis, step), messages
