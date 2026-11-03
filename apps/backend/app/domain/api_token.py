"""Tokens pessoais que autorizam a leitura dos próprios dados pelo MCP."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from app.domain.errors import InvalidValue


@dataclass
class ApiToken:
    id: UUID
    company_id: UUID
    user_id: UUID
    name: str
    token_hash: str
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None

    @classmethod
    def create(
        cls, *, company_id: UUID, user_id: UUID, name: str, token_hash: str, now: datetime
    ) -> "ApiToken":
        cleaned = name.strip()
        if not 1 <= len(cleaned) <= 80:
            raise InvalidValue("O nome deve ter de 1 a 80 caracteres.")
        return cls(uuid4(), company_id, user_id, cleaned, token_hash, now)

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None
