"""Revisão humana e publicação: o último agente só publica depois que a pessoa aprova."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Any
from uuid import UUID

from app.domain.actor import Actor
from app.domain.agents import Agent, StepStatus
from app.domain.analysis import Analysis
from app.domain.errors import InvalidValue, NotFound
from app.domain.outputs import (
    McpSession,
    OutputConnector,
    OutputStatus,
    Proposal,
    ProposedItem,
    output_by_id,
    tool_calls,
)
from app.domain.ports import AnalysisRepository, OutputGateway

MAX_ITEMS = 30


@dataclass(frozen=True)
class PublishDecision:
    approve: bool
    destinations: Sequence[str] = ()
    # A pessoa pode editar o resumo e os itens antes de aprovar.
    summary: str | None = None
    items: Sequence[ProposedItem] | None = None


class PublishingService:
    def __init__(
        self,
        analyses: AnalysisRepository,
        gateway: OutputGateway,
        clock: Callable[[], datetime],
    ) -> None:
        self._analyses = analyses
        self._gateway = gateway
        self._clock = clock

    async def connect(self, actor: Actor, output_id: str) -> McpSession:
        """Handshake MCP com o conector de saída (initialize + tools/list)."""
        actor.require_company()
        [connector] = self._connectors([output_id])
        return await self._gateway.connect(connector)

    def _connectors(self, ids: Sequence[str]) -> list[OutputConnector]:
        if not ids:
            raise InvalidValue("Escolha ao menos um conector de saída.")
        connectors: list[OutputConnector] = []
        for output_id in dict.fromkeys(ids):
            connector = output_by_id(output_id)
            if connector is None:
                raise InvalidValue("Conector de saída desconhecido.")
            if connector.status is OutputStatus.BLOCKED:
                raise InvalidValue(connector.note or f"{connector.name} está bloqueado.")
            connectors.append(connector)
        return connectors

    @staticmethod
    def _proposal(output: dict[str, Any], decision: PublishDecision) -> Proposal:
        saved = output.get("proposta") or {}
        summary = decision.summary if decision.summary is not None else saved.get("resumo", "")
        if decision.items is not None:
            items = list(decision.items)
        else:
            items = [
                ProposedItem(i.get("titulo", ""), i.get("responsavel"), i.get("prazo"))
                for i in saved.get("itens", [])
            ]
        items = [i for i in items if i.title.strip()]
        if len(items) > MAX_ITEMS:
            raise InvalidValue(f"Publique até {MAX_ITEMS} itens por vez.")
        return Proposal(summary=summary.strip()[:2000], items=items)

    async def publish(self, actor: Actor, analysis_id: UUID, decision: PublishDecision) -> Analysis:
        analysis = await self._analyses.get_for_owner(actor.user_id, analysis_id)
        if analysis is None:
            raise NotFound()
        step = next((s for s in analysis.steps if s.agent is Agent.PUBLISHER), None)
        if step is None or step.status is not StepStatus.WAITING:
            raise InvalidValue("Esta análise não está aguardando revisão humana.")

        if not decision.approve:
            now = self._clock()
            step = replace(
                step.log(now, "review", "Descartado na revisão humana"),
                status=StepStatus.SKIPPED,
                finished_at=now,
            )
            return await self._save(analysis, step)

        connectors = self._connectors(decision.destinations)
        proposal = self._proposal(dict(step.output), decision)
        step = step.log(
            self._clock(),
            "review",
            "Aprovado na revisão humana",
            destinos=[c.id for c in connectors],
            itens=len(proposal.items),
        )
        title = f"Atentio · {analysis.prompt_text[:80]}"
        deliveries: list[dict[str, Any]] = []
        for connector in connectors:
            session = await self._gateway.connect(connector)
            step = step.log(
                self._clock(),
                "mcp_initialize",
                f"initialize com {session.server}",
                conector=connector.id,
                workspace=session.workspace,
            )
            step = step.log(
                self._clock(),
                "mcp_tools",
                f"tools/list: {len(session.tools)} ferramentas",
                conector=connector.id,
                ferramentas=list(session.tools),
            )
            calls = tool_calls(connector, proposal, title=title)
            if not calls:
                step = step.log(
                    self._clock(), "info", f"Nada a publicar em {connector.name}: sem pendências"
                )
            for call in calls:
                step = step.log(
                    self._clock(),
                    "mcp_call",
                    f"tools/call em {connector.name}",
                    conector=connector.id,
                    ferramenta=call["name"],
                )
                result = await self._gateway.deliver(connector, call)
                step = step.log(
                    self._clock(),
                    "mcp_result",
                    f"{connector.name}: {result.status}",
                    conector=connector.id,
                    referencia=result.reference,
                )
                deliveries.append(
                    {
                        "conector": connector.id,
                        "nome": connector.name,
                        "ferramenta": call["name"],
                        "argumentos": call["arguments"],
                        "status": result.status,
                        "referencia": result.reference,
                        "mensagem": result.message,
                        "workspace": session.workspace,
                        "item": dict(result.item),
                    }
                )
        now = self._clock()
        done = step.finish(
            now,
            proposta={
                "resumo": proposal.summary,
                "itens": [
                    {"titulo": i.title, "responsavel": i.owner, "prazo": i.due}
                    for i in proposal.items
                ],
            },
            entregas=deliveries,
        )
        return await self._save(analysis, done)

    async def _save(self, analysis: Analysis, step: Any) -> Analysis:
        steps = [step if s.agent is step.agent else s for s in analysis.steps]
        updated = replace(analysis, steps=steps)
        await self._analyses.save(updated)
        return updated
