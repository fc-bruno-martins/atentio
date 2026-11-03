"""Números de WhatsApp conectados e tentativas de conexão."""

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

from app.domain.errors import AttemptClosed, InvalidValue

MAX_CONNECTED_NUMBERS = 2
CONFIRMATION_WINDOW = timedelta(minutes=2)
# Duas verificações seguidas: quedas passageiras não exigem novo QR code.
DOWN_TOLERANCE = timedelta(seconds=25)
OPEN_STATE = "open"
LOGGED_OUT_CODE = 401


class NumberStatus(StrEnum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"


class DisconnectReason(StrEnum):
    OWNER = "owner"
    COMPANY_ADMIN = "company_admin"
    PHONE = "phone"
    ACCOUNT_DEACTIVATED = "account_deactivated"
    COMPANY_DEACTIVATED = "company_deactivated"


class AttemptStatus(StrEnum):
    PENDING = "pending"
    CONNECTED = "connected"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class AttemptFailure(StrEnum):
    NUMBER_IN_USE = "number_in_use"
    LIMIT_REACHED = "limit_reached"


@dataclass(frozen=True)
class InstanceInfo:
    state: str
    owner_jid: str | None
    disconnection_code: int | None = None

    @property
    def is_logged_out(self) -> bool:
        return self.disconnection_code == LOGGED_OUT_CODE and self.state != OPEN_STATE

    @property
    def is_open(self) -> bool:
        return self.state == OPEN_STATE and self.owner_jid is not None


def phone_from_jid(jid: str) -> str:
    """`5511999999999:12@s.whatsapp.net` vira `5511999999999`."""
    phone = re.split(r"[:@]", jid.strip(), maxsplit=1)[0]
    if not re.fullmatch(r"\d{8,15}", phone):
        raise InvalidValue("Telefone inválido.")
    return phone


@dataclass
class WhatsAppNumber:
    id: UUID
    company_id: UUID
    owner_user_id: UUID
    phone: str
    status: NumberStatus
    status_changed_at: datetime
    instance_name: str | None = None
    disconnect_reason: DisconnectReason | None = None
    disconnected_by: UUID | None = None
    last_confirmed_at: datetime | None = None
    down_since: datetime | None = None
    message_events_enabled: bool = False

    @classmethod
    def connect(
        cls,
        *,
        company_id: UUID,
        owner_user_id: UUID,
        phone: str,
        instance_name: str,
        now: datetime,
    ) -> "WhatsAppNumber":
        return cls(
            id=uuid4(),
            company_id=company_id,
            owner_user_id=owner_user_id,
            phone=phone,
            status=NumberStatus.CONNECTED,
            status_changed_at=now,
            instance_name=instance_name,
            last_confirmed_at=now,
            message_events_enabled=True,
        )

    @property
    def is_connected(self) -> bool:
        return self.status is NumberStatus.CONNECTED

    def reconnect(self, instance_name: str, now: datetime) -> None:
        if not self.is_connected:
            self.status_changed_at = now
        self.status = NumberStatus.CONNECTED
        self.instance_name = instance_name
        self.disconnect_reason = None
        self.disconnected_by = None
        self.last_confirmed_at = now
        self.down_since = None
        self.message_events_enabled = True

    def disconnect(
        self, reason: DisconnectReason, now: datetime, *, by: UUID | None = None
    ) -> None:
        if not self.is_connected:
            return
        self.status = NumberStatus.DISCONNECTED
        self.status_changed_at = now
        self.disconnect_reason = reason
        self.disconnected_by = by
        self.down_since = None

    def confirm(self, now: datetime) -> None:
        self.last_confirmed_at = now
        self.down_since = None

    def observe_down(self, now: datetime) -> bool:
        """Registra a queda e diz se ela já passou da tolerância."""
        if self.down_since is None:
            self.down_since = now
        return now - self.down_since >= DOWN_TOLERANCE

    def is_confirmed(self, now: datetime) -> bool:
        """Só a situação "conectado" pode estar desatualizada."""
        if not self.is_connected:
            return True
        return (
            self.last_confirmed_at is not None
            and now - self.last_confirmed_at <= CONFIRMATION_WINDOW
        )


@dataclass
class ConnectionAttempt:
    id: UUID
    company_id: UUID
    user_id: UUID
    instance_name: str
    expires_at: datetime
    status: AttemptStatus = AttemptStatus.PENDING
    failure: AttemptFailure | None = None
    number_id: UUID | None = None
    instance_removed: bool = False

    @classmethod
    def start(
        cls, *, company_id: UUID, user_id: UUID, now: datetime, ttl: timedelta
    ) -> "ConnectionAttempt":
        return cls(
            id=uuid4(),
            company_id=company_id,
            user_id=user_id,
            instance_name=f"judite-{uuid4().hex}",
            expires_at=now + ttl,
        )

    @property
    def is_pending(self) -> bool:
        return self.status is AttemptStatus.PENDING

    def has_expired(self, now: datetime) -> bool:
        return self.is_pending and now >= self.expires_at

    def _finish(self, status: AttemptStatus) -> None:
        if not self.is_pending:
            raise AttemptClosed()
        self.status = status

    def complete(self, number_id: UUID) -> None:
        self._finish(AttemptStatus.CONNECTED)
        self.number_id = number_id

    def reject(self, failure: AttemptFailure) -> None:
        self._finish(AttemptStatus.REJECTED)
        self.failure = failure

    def expire(self) -> None:
        self._finish(AttemptStatus.EXPIRED)

    def cancel(self) -> None:
        self._finish(AttemptStatus.CANCELLED)
