"""Agentes da análise: quem faz o quê, presets de modelo e o rastro de cada etapa.

O pipeline tem cinco agentes, cada um consumindo a saída do anterior e com as regras num arquivo
próprio: Coletor (`collector`, código) → Extrator (`extractor`, modelo rápido) → Analista (modelo
escolhido; o prompt fica em `app.domain.analysis`) → Estruturador (`structurer`, código) →
Publicador (aguarda a revisão humana e publica nos conectores de saída, via MCP; regras em
`app.domain.outputs`).
"""

from app.domain.agents.collector import collect_summary
from app.domain.agents.extractor import EXTRACTOR_SYSTEM, FACT_KEYS, fact_counts, parse_facts
from app.domain.agents.presets import (
    DEFAULT_PRESET,
    EXTRACTOR_PRESET,
    PRESETS,
    ModelPreset,
    preset_by_id,
    preset_by_model,
)
from app.domain.agents.step import Agent, AgentStep, StepStatus, initial_steps
from app.domain.agents.structurer import structure

__all__ = [
    "DEFAULT_PRESET",
    "EXTRACTOR_PRESET",
    "EXTRACTOR_SYSTEM",
    "FACT_KEYS",
    "PRESETS",
    "Agent",
    "AgentStep",
    "ModelPreset",
    "StepStatus",
    "collect_summary",
    "fact_counts",
    "initial_steps",
    "parse_facts",
    "preset_by_id",
    "preset_by_model",
    "structure",
]
