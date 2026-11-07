"""5. Publicador: propõe o que levar aos conectores de saída e espera a revisão humana.

A publicação, depois da aprovação, fica em `app.services.publishing`.
"""

from dataclasses import replace

from app.domain.agents import Agent, StepStatus
from app.domain.analysis import Analysis
from app.domain.outputs import OUTPUTS, propose
from app.services.agents.context import AgentContext


async def run(ctx: AgentContext, analysis: Analysis, result: str) -> Analysis:
    if not any(s.agent is Agent.PUBLISHER for s in analysis.steps):
        return analysis  # análise antiga, sem publicador
    proposal = propose(result)
    now = ctx.clock()
    step = ctx.step(analysis, Agent.PUBLISHER).start(now, pendencias=len(proposal.items))
    step = step.log(
        now,
        "proposal",
        "Proposta montada a partir da análise",
        itens=len(proposal.items),
    )
    step = step.log(now, "waiting", "Aguardando revisão humana")
    step = replace(
        step,
        status=StepStatus.WAITING,
        output={
            "proposta": {
                "resumo": proposal.summary,
                "itens": [
                    {"titulo": i.title, "responsavel": i.owner, "prazo": i.due}
                    for i in proposal.items
                ],
            },
            "destinos": [
                {"id": o.id, "nome": o.name, "acao": o.action, "status": o.status.value}
                for o in OUTPUTS
            ],
        },
    )
    return await ctx.update(analysis, step)
