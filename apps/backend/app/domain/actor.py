from dataclasses import dataclass
from uuid import UUID

from app.domain.errors import Forbidden
from app.domain.user import Role


@dataclass(frozen=True)
class Actor:
    """Pessoa autenticada. `company_id` vem sempre da sessão, nunca do cliente."""

    user_id: UUID
    session_id: UUID
    role: Role
    company_id: UUID | None

    def require_company(self) -> UUID:
        if self.role is Role.PLATFORM_ADMIN or self.company_id is None:
            raise Forbidden()
        return self.company_id
