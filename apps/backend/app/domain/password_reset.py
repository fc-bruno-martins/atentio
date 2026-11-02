from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.domain.errors import InvalidResetLink


@dataclass
class PasswordReset:
    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    used_at: datetime | None = None

    @classmethod
    def create(
        cls, *, user_id: UUID, token_hash: str, now: datetime, ttl: timedelta
    ) -> "PasswordReset":
        return cls(id=uuid4(), user_id=user_id, token_hash=token_hash, expires_at=now + ttl)

    def use(self, now: datetime) -> None:
        if self.used_at is not None or now >= self.expires_at:
            raise InvalidResetLink()
        self.used_at = now
