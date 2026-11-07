"""Modelos pré-selecionados: a pessoa escolhe o perfil, não o modelo."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelPreset:
    id: str
    label: str
    description: str
    model: str


PRESETS: tuple[ModelPreset, ...] = (
    ModelPreset(
        "rapido",
        "Rápido",
        "Respostas em segundos, ideal para resumos.",
        "anthropic/claude-haiku-5.5",
    ),
    ModelPreset(
        "equilibrado",
        "Equilibrado",
        "Bom raciocínio com custo baixo.",
        "google/gemini-3.8-flash",
    ),
    ModelPreset(
        "profundo",
        "Profundo",
        "Raciocínio mais cuidadoso para conversas longas ou delicadas.",
        "anthropic/claude-sonnet-5.5",
    ),
)
DEFAULT_PRESET = "equilibrado"
EXTRACTOR_PRESET = "rapido"


def preset_by_id(preset_id: str) -> ModelPreset | None:
    return next((p for p in PRESETS if p.id == preset_id), None)


def preset_by_model(model: str) -> ModelPreset | None:
    return next((p for p in PRESETS if p.model == model), None)
