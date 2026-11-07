"""Pipeline de agentes (harness): cada um recebe a saída do anterior e deixa seu rastro.

Além de entrada e saída, cada etapa registra eventos de debug (prompt montado, chamada ao
modelo, resposta, repasse ao próximo agente) e métricas (latência e tokens). Cada agente fica
num arquivo próprio deste pacote; aqui só se define a ordem.
"""

from collections.abc import Awaitable, Callable
from datetime import datetime

from app.domain.analysis import Analysis
from app.domain.ports import AnalysisModel, AnalysisRepository, MessageRepository
from app.services.agents import analyst, collector, extractor, publisher, structurer
from app.services.agents.context import AgentContext
from app.services.analyses import AgentJob


class AgentPipeline:
    def __init__(
        self,
        messages: MessageRepository,
        analyses: AnalysisRepository,
        model: AnalysisModel,
        clock: Callable[[], datetime],
        checkpoint: Callable[[], Awaitable[None]],
    ) -> None:
        self._ctx = AgentContext(messages, analyses, model, clock, checkpoint)

    async def execute(self, job: AgentJob) -> Analysis:
        analysis = await self._ctx.analyses.get(job.analysis_id)
        if analysis is None:
            raise LookupError(job.analysis_id)

        analysis, messages = await collector.run(self._ctx, analysis, job)
        analysis, facts = await extractor.run(self._ctx, analysis, job, messages)
        analysis, result = await analyst.run(self._ctx, analysis, job, messages, facts)
        if result is None:
            return analysis
        analysis = await structurer.run(self._ctx, analysis, result)
        return await publisher.run(self._ctx, analysis, result)
