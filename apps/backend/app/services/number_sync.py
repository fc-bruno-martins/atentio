"""Sincroniza as conexões com o que a Evolution API informa."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from app.core.logging import get_logger
from app.domain.errors import NumberAlreadyConnected, WhatsAppUnavailable
from app.domain.number import (
    MAX_CONNECTED_NUMBERS,
    OPEN_STATE,
    AttemptFailure,
    ConnectionAttempt,
    DisconnectReason,
    WhatsAppNumber,
    phone_from_jid,
)
from app.domain.ports import (
    AttemptRepository,
    NumberRepository,
    UserRepository,
    WhatsAppGateway,
)

log = get_logger(__name__)
CONNECTION_UPDATE = "connection.update"
LOGOUT_INSTANCE = "logout.instance"
CLOSE_STATE = "close"
LOGGED_OUT_REASON = 401


@dataclass
class ReconcileSummary:
    expired: int = 0
    confirmed: int = 0
    disconnected: int = 0
    removed: int = 0
    purged: int = 0
    whatsapp_available: bool = True


class NumberSyncService:
    def __init__(
        self,
        numbers: NumberRepository,
        attempts: AttemptRepository,
        users: UserRepository,
        gateway: WhatsAppGateway,
        clock: Callable[[], datetime],
    ) -> None:
        self._numbers = numbers
        self._attempts = attempts
        self._users = users
        self._gateway = gateway
        self._clock = clock

    async def handle_event(
        self, event: str, instance_name: str, state: str | None, reason: int | None = None
    ) -> None:
        if event == CONNECTION_UPDATE and state == OPEN_STATE:
            await self.confirm(instance_name)
        elif event == LOGOUT_INSTANCE or (
            event == CONNECTION_UPDATE and state == CLOSE_STATE and reason == LOGGED_OUT_REASON
        ):
            # O erro 515 do pareamento é normal: só o encerramento da sessão desconecta.
            await self._ended_on_phone(instance_name)

    async def _ended_on_phone(self, instance_name: str) -> None:
        number = await self._numbers.get_by_instance(instance_name)
        if number is not None and number.is_connected:
            number.disconnect(DisconnectReason.PHONE, self._clock())
            await self._numbers.save(number)

    async def reconcile(self) -> ReconcileSummary:
        """Idempotente: cobre webhooks perdidos, prazos e instâncias que ficaram para trás."""
        summary = ReconcileSummary()
        for attempt in await self._attempts.list_expired(self._clock()):
            attempt.expire()
            await self._attempts.save(attempt)
            summary.expired += 1
        try:
            await self._check_connected(summary)
        except WhatsAppUnavailable:
            # Sem resposta, a situação conhecida fica; `confirmed` passa a falso sozinho.
            summary.whatsapp_available = False
            return summary
        for attempt in await self._attempts.list_with_stale_instance():
            if await self.close_attempt_instance(attempt):
                summary.removed += 1
        for number in await self._numbers.list_with_stale_instance():
            if await self.close_number_instance(number):
                summary.removed += 1
        await self._enable_message_events()
        return summary

    async def _enable_message_events(self) -> None:
        for number in await self._numbers.list_without_message_events():
            if number.instance_name is None:
                continue
            await self._gateway.enable_message_events(number.instance_name)
            number.message_events_enabled = True
            await self._numbers.save(number)

    async def _check_connected(self, summary: ReconcileSummary) -> None:
        for number in await self._numbers.list_connected():
            now = self._clock()
            info = (
                await self._gateway.get_instance(number.instance_name)
                if number.instance_name
                else None
            )
            if info is not None and info.is_open:
                number.confirm(now)
                summary.confirmed += 1
            elif info is None or info.is_logged_out or number.observe_down(now):
                number.disconnect(DisconnectReason.PHONE, now)
                summary.disconnected += 1
            await self._numbers.save(number)

    async def confirm(self, instance_name: str) -> ConnectionAttempt | None:
        """Conclui a tentativa quando o QR foi lido. Webhook e polling podem chamar juntos."""
        attempt = await self._attempts.get_by_instance(instance_name)
        if attempt is None or not attempt.is_pending:
            return attempt
        info = await self._gateway.get_instance(instance_name)
        if info is None or not info.is_open or info.owner_jid is None:
            return attempt
        phone = phone_from_jid(info.owner_jid)

        # Serializa as tentativas da pessoa antes de reavaliar limite e posse.
        await self._users.lock(attempt.user_id)
        attempt = await self._attempts.get_by_instance(instance_name)
        if attempt is None or not attempt.is_pending:
            return attempt

        if await self._numbers.is_connected_elsewhere(phone, attempt.user_id):
            return await self._reject(attempt, AttemptFailure.NUMBER_IN_USE)
        existing = await self._numbers.get_by_owner_and_phone(attempt.user_id, phone)
        already_counted = existing is not None and existing.is_connected
        connected = await self._numbers.count_connected(attempt.user_id)
        if not already_counted and connected >= MAX_CONNECTED_NUMBERS:
            return await self._reject(attempt, AttemptFailure.LIMIT_REACHED)

        try:
            number = await self._register(attempt, existing, phone)
        except NumberAlreadyConnected:
            return await self._reject(attempt, AttemptFailure.NUMBER_IN_USE)
        attempt.complete(number.id)
        await self._attempts.save(attempt)
        return attempt

    async def _register(
        self, attempt: ConnectionAttempt, existing: WhatsAppNumber | None, phone: str
    ) -> WhatsAppNumber:
        now = self._clock()
        if existing is None:
            number = WhatsAppNumber.connect(
                company_id=attempt.company_id,
                owner_user_id=attempt.user_id,
                phone=phone,
                instance_name=attempt.instance_name,
                now=now,
            )
            await self._numbers.add(number)
            return number
        previous = existing.instance_name
        existing.reconnect(attempt.instance_name, now)
        await self._numbers.save(existing)
        if previous is not None and previous != attempt.instance_name:
            await self.remove_instance(previous)
        return existing

    async def _reject(
        self, attempt: ConnectionAttempt, failure: AttemptFailure
    ) -> ConnectionAttempt:
        attempt.reject(failure)
        await self.close_attempt_instance(attempt)
        return attempt

    async def close_attempt_instance(self, attempt: ConnectionAttempt) -> bool:
        attempt.instance_removed = await self.remove_instance(attempt.instance_name)
        await self._attempts.save(attempt)
        return attempt.instance_removed

    async def close_number_instance(self, number: WhatsAppNumber) -> bool:
        if number.instance_name is None or not await self.remove_instance(number.instance_name):
            return False
        number.instance_name = None
        await self._numbers.save(number)
        return True

    async def remove_instance(self, name: str) -> bool:
        """Melhor esforço: o estado local já mudou, e a reconciliação tenta de novo."""
        try:
            await self._gateway.logout(name)
            await self._gateway.delete(name)
        except WhatsAppUnavailable:
            log.warning("remocao_de_instancia_falhou")
            return False
        return True
