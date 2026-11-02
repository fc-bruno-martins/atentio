from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

from app.domain.errors import InvalidInvitation, InvalidValue
from app.domain.user import COMPANY_ROLES, Role, normalize_email


class InvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"


@dataclass
class Invitation:
    id: UUID
    company_id: UUID
    email: str
    role: Role
    token_hash: str
    expires_at: datetime
    invited_by: UUID
    status: InvitationStatus = InvitationStatus.PENDING
    last_send_failed_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        company_id: UUID,
        email: str,
        role: Role,
        token_hash: str,
        now: datetime,
        ttl: timedelta,
        invited_by: UUID,
    ) -> "Invitation":
        if role not in COMPANY_ROLES:
            raise InvalidValue("Perfil inválido para um convite.")
        return cls(
            id=uuid4(),
            company_id=company_id,
            email=normalize_email(email),
            role=role,
            token_hash=token_hash,
            expires_at=now + ttl,
            invited_by=invited_by,
        )

    def is_acceptable(self, now: datetime) -> bool:
        return self.status is InvitationStatus.PENDING and now < self.expires_at

    def accept(self, now: datetime) -> None:
        if not self.is_acceptable(now):
            raise InvalidInvitation()
        self.status = InvitationStatus.ACCEPTED

    def cancel(self) -> None:
        if self.status is not InvitationStatus.PENDING:
            raise InvalidInvitation()
        self.status = InvitationStatus.CANCELLED

    def renew(self, token_hash: str, now: datetime, ttl: timedelta) -> None:
        """Reenvio: o link anterior deixa de valer."""
        if self.status is not InvitationStatus.PENDING:
            raise InvalidInvitation()
        self.token_hash = token_hash
        self.expires_at = now + ttl

    def record_delivery(self, *, failed_at: datetime | None) -> None:
        self.last_send_failed_at = failed_at
