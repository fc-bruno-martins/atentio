from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID, uuid4


@dataclass
class AuthSession:
    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    revoked_at: datetime | None = None

    @classmethod
    def open(
        cls, *, user_id: UUID, token_hash: str, now: datetime, ttl: timedelta
    ) -> "AuthSession":
        return cls(id=uuid4(), user_id=user_id, token_hash=token_hash, expires_at=now + ttl)

    def is_active(self, now: datetime) -> bool:
        return self.revoked_at is None and now < self.expires_at

    def extend(self, now: datetime, ttl: timedelta) -> None:
        self.expires_at = now + ttl

    def revoke(self, now: datetime) -> None:
        self.revoked_at = now
