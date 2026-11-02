"""Estado da plataforma."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class Component(StrEnum):
    BACKEND = "backend"
    DATABASE = "database"
    QUEUE = "queue"
    EVOLUTION_API = "evolution_api"
    WORKERS = "workers"
    MCP = "mcp"


@dataclass(frozen=True)
class ComponentStatus:
    component: Component
    available: bool
    detail: str | None = None

    def __post_init__(self) -> None:
        if self.available and self.detail is not None:
            raise ValueError("detail só é permitido quando o componente está indisponível")

    @classmethod
    def up(cls, component: Component) -> "ComponentStatus":
        return cls(component, available=True)

    @classmethod
    def down(cls, component: Component, detail: str) -> "ComponentStatus":
        return cls(component, available=False, detail=detail)


@dataclass(frozen=True)
class PlatformStatus:
    components: tuple[ComponentStatus, ...]
    schema_version: str | None
    checked_at: datetime

    def __post_init__(self) -> None:
        if [c.component for c in self.components] != list(Component):
            raise ValueError("components deve ter um item por Component, na ordem do enum")

    @property
    def healthy(self) -> bool:
        return all(c.available for c in self.components)
