"""2. Extrator: levanta fatos (assuntos, pedidos, compromissos, decisões, datas)."""

import json
from collections.abc import Sequence

from app.core.logging import get_logger
from app.domain.agents import EXTRACTOR_SYSTEM, Agent, fact_counts, parse_facts
from app.domain.analysis import Analysis, CompletionRequest, build_completion
from app.domain.errors import AnalysisModelFailed, AnalysisNotConfigured
from app.domain.message import Message
from app.services.agents.context import AgentContext
from app.services.analyses import AgentJob

log = get_logger(__name__)
MAX_FACTS_CHARS = 6000


async def run(
    ctx: AgentContext, analysis: Analysis, job: AgentJob, messages: Sequence[Message]
) -> tuple[Analysis, str | None]:
    """Devolve os fatos em JSON; sem fatos (`None`), o analista segue só com a conversa."""
    transcript_chars = sum(len(m.text or "") for m in messages)
    step = ctx.step(analysis, Agent.EXTRACTOR).start(
        ctx.clock(), mensagens=len(messages), caracteres=transcript_chars
    )
    analysis = await ctx.update(analysis, step)
    try:
        base = build_completion(
            model=job.extractor_model,
            prompt="Extraia os fatos.",
            messages=messages,
            settings=None,
        )
        analysis, step, completion = await ctx.call(
            analysis,
            step,
            CompletionRequest(job.extractor_model, EXTRACTOR_SYSTEM, base.user, 0),
        )
        facts = parse_facts(completion.text)
        valid = "bruto" not in facts
        step = step.log(
            ctx.clock(),
            "parse" if valid else "warning",
            "JSON de fatos válido" if valid else "Resposta fora do formato JSON",
        )
        facts_text = json.dumps(facts, ensure_ascii=False)[:MAX_FACTS_CHARS]
        counts = fact_counts(facts)
        step = ctx.handoff(step, Agent.ANALYST, f"{sum(counts.values())} fatos")
        analysis = await ctx.update(
            analysis, step.finish(ctx.clock(), fatos=facts, contagem=counts)
        )
        return analysis, facts_text
    except (AnalysisModelFailed, AnalysisNotConfigured):
        log.warning("agente_extrator_falhou")
        step = ctx.handoff(step, Agent.ANALYST, "sem fatos, só a conversa")
        analysis = await ctx.update(
            analysis, step.fail(ctx.clock(), "O extrator não respondeu; o analista segue.")
        )
        return analysis, None
