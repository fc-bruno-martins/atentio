"""Números do dono e visão do admin da empresa, sempre sem conteúdo de mensagens."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from app.domain.actor import Actor
from app.domain.errors import NotFound, NumberLimitReached
from app.domain.number import (
    MAX_CONNECTED_NUMBERS,
    ConnectionAttempt,
    DisconnectReason,
    WhatsAppNumber,
)
from app.domain.ports import (
    AttemptRepository,
    NumberRepository,
    UserRepository,
    WhatsAppGateway,
)
from app.domain.user import User
from app.services.number_sync import NumberSyncService


@dataclass(frozen=True)
class AttemptView:
    """O QR só existe nesta resposta: nunca é guardado (FR-021)."""

    attempt: ConnectionAttempt
    qr_code: str | None = None


@dataclass(frozen=True)
class CompanyNumber:
    number: WhatsAppNumber
    owner: User


class NumberService:
    def __init__(
        self,
        numbers: NumberRepository,
        attempts: AttemptRepository,
        users: UserRepository,
        gateway: WhatsAppGateway,
        sync: NumberSyncService,
        clock: Callable[[], datetime],
        attempt_ttl: timedelta,
    ) -> None:
        self._numbers = numbers
        self._attempts = attempts
        self._users = users
        self._gateway = gateway
        self._sync = sync
        self._clock = clock
        self._ttl = attempt_ttl

    def now(self) -> datetime:
        return self._clock()

    async def list_numbers(self, actor: Actor) -> Sequence[WhatsAppNumber]:
        return await self._numbers.list_by_owner(actor.user_id)

    async def start(self, actor: Actor) -> AttemptView:
        company_id = actor.require_company()
        await self._users.lock(actor.user_id)
        if await self._numbers.count_connected(actor.user_id) >= MAX_CONNECTED_NUMBERS:
            raise NumberLimitReached()
        # Só uma tentativa por vez: um QR abandonado não pode consumir o limite.
        for previous in await self._attempts.list_pending_by_user(actor.user_id):
            await self._close(previous)
        attempt = ConnectionAttempt.start(
            company_id=company_id, user_id=actor.user_id, now=self._clock(), ttl=self._ttl
        )
        qr_code = await self._gateway.create_instance(attempt.instance_name)
        await self._attempts.add(attempt)
        return AttemptView(attempt, qr_code)

    async def get(self, actor: Actor, attempt_id: UUID) -> AttemptView:
        attempt = await self._find(actor, attempt_id)
        if not attempt.is_pending:
            return AttemptView(attempt)
        if attempt.has_expired(self._clock()):
            attempt.expire()
            await self._sync.close_attempt_instance(attempt)
            return AttemptView(attempt)
        qr_code = await self._gateway.get_qr(attempt.instance_name)
        if qr_code is None:
            # Sem QR, a instância pode já estar aberta, mesmo se o webhook tiver se perdido.
            confirmed = await self._sync.confirm(attempt.instance_name)
            return AttemptView(confirmed or attempt)
        return AttemptView(attempt, qr_code)

    async def cancel(self, actor: Actor, attempt_id: UUID) -> None:
        attempt = await self._find(actor, attempt_id)
        if attempt.is_pending:
            await self._close(attempt)

    async def disconnect(self, actor: Actor, number_id: UUID) -> WhatsAppNumber:
        number = await self._numbers.get_for_owner(actor.user_id, number_id)
        if number is None:
            raise NotFound()
        return await self._disconnect(number, DisconnectReason.OWNER, actor)

    async def list_company_numbers(self, actor: Actor) -> Sequence[CompanyNumber]:
        company_id = actor.require_company()
        owners = {u.id: u for u in await self._users.list_by_company(company_id)}
        return [
            CompanyNumber(number, owners[number.owner_user_id])
            for number in await self._numbers.list_by_company(company_id)
        ]

    async def disconnect_in_company(self, actor: Actor, number_id: UUID) -> CompanyNumber:
        company_id = actor.require_company()
        number = await self._numbers.get_in_company(company_id, number_id)
        owner = (
            await self._users.get_in_company(company_id, number.owner_user_id) if number else None
        )
        if number is None or owner is None:
            raise NotFound()
        reason = (
            DisconnectReason.OWNER if owner.id == actor.user_id else DisconnectReason.COMPANY_ADMIN
        )
        return CompanyNumber(await self._disconnect(number, reason, actor), owner)

    async def _disconnect(
        self, number: WhatsAppNumber, reason: DisconnectReason, actor: Actor
    ) -> WhatsAppNumber:
        number.disconnect(reason, self._clock(), by=actor.user_id)
        await self._numbers.save(number)
        await self._sync.close_number_instance(number)
        return number

    async def _find(self, actor: Actor, attempt_id: UUID) -> ConnectionAttempt:
        attempt = await self._attempts.get_for_user(actor.user_id, attempt_id)
        if attempt is None:
            raise NotFound()
        return attempt

    async def _close(self, attempt: ConnectionAttempt) -> None:
        attempt.cancel()
        await self._sync.close_attempt_instance(attempt)
