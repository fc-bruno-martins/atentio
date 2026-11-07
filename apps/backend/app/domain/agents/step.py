"""Os agentes do pipeline e o rastro que cada um deixa (entrada, saída, eventos e métricas)."""

from collections.abc import Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime
from enum import StrEnum
from typing import Any


class Agent(StrEnum):
    COLLECTOR = "coletor"
    EXTRACTOR = "extrator"
    ANALYST = "analista"
    STRUCTURER = "estruturador"
    PUBLISHER = "publicador"


class StepStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    # Publicador: parado à espera da revisão humana, ou descartado nela.
    WAITING = "waiting"
    SKIPPED = "skipped"


@dataclass(frozen=True)
class AgentStep:
    """O que um agente recebeu, o que fez e o que entregou."""

    agent: Agent
    status: StepStatus = StepStatus.PENDING
    model: str | None = None
    input: Mapping[str, Any] = field(default_factory=dict)
    output: Mapping[str, Any] = field(default_factory=dict)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    # Debug do harness: eventos em ordem e números da execução (latência, tokens).
    events: tuple[Mapping[str, Any], ...] = ()
    metrics: Mapping[str, Any] = field(default_factory=dict)

    def log(self, now: datetime, kind: str, message: str, **data: Any) -> "AgentStep":
        event = {"at": now.isoformat(), "kind": kind, "message": message, "data": data}
        return replace(self, events=(*self.events, event))

    def measure(self, **metrics: Any) -> "AgentStep":
        return replace(self, metrics={**self.metrics, **metrics})

    def start(self, now: datetime, **input: Any) -> "AgentStep":
        started = replace(self, status=StepStatus.RUNNING, started_at=now, input=input)
        return started.log(now, "start", "Agente iniciado", **input)

    def finish(self, now: datetime, **output: Any) -> "AgentStep":
        done = replace(self, status=StepStatus.DONE, finished_at=now, output=output)
        return done.log(now, "done", "Agente concluído")

    def fail(self, now: datetime, reason: str) -> "AgentStep":
        failed = replace(self, status=StepStatus.FAILED, finished_at=now, output={"erro": reason})
        return failed.log(now, "error", reason)


def initial_steps(analyst_model: str, extractor_model: str) -> list[AgentStep]:
    return [
        AgentStep(Agent.COLLECTOR),
        AgentStep(Agent.EXTRACTOR, model=extractor_model),
        AgentStep(Agent.ANALYST, model=analyst_model),
        AgentStep(Agent.STRUCTURER),
        AgentStep(Agent.PUBLISHER),
    ]
