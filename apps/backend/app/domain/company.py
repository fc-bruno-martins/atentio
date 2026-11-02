from dataclasses import dataclass
from uuid import UUID, uuid4

from app.domain.errors import InvalidValue


def validate_name(name: str) -> str:
    cleaned = name.strip()
    if not 2 <= len(cleaned) <= 120:
        raise InvalidValue("O nome deve ter entre 2 e 120 caracteres.")
    return cleaned


@dataclass
class Company:
    id: UUID
    name: str
    is_active: bool = True

    @classmethod
    def create(cls, name: str) -> "Company":
        return cls(id=uuid4(), name=validate_name(name))

    def rename(self, name: str) -> None:
        self.name = validate_name(name)

    def activate(self) -> None:
        self.is_active = True

    def deactivate(self) -> None:
        self.is_active = False
