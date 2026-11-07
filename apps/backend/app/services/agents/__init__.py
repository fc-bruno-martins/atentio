"""Pipeline de agentes da análise, com um arquivo por agente.

`collector` → `extractor` → `analyst` → `structurer` → `publisher`, orquestrados por `pipeline`
e apoiados no `context` comum.
"""

from app.services.agents.pipeline import AgentPipeline

__all__ = ["AgentPipeline"]
