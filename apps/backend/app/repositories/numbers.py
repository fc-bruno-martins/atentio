"""Implementam os ports de números. Models do ORM não saem deste módulo."""

from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from datetime import datetime
from uuid import UUID

from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import NumberAlreadyConnected
from app.domain.number import (
    AttemptFailure,
    AttemptStatus,
    ConnectionAttempt,
    DisconnectReason,
    NumberStatus,
    WhatsAppNumber,
)
from app.models import ConnectionAttemptModel, WhatsAppNumberModel

CONNECTED_INDEX = "uq_whatsapp_numbers_connected_phone"


def _number(m: WhatsAppNumberModel) -> WhatsAppNumber:
    return WhatsAppNumber(
        id=m.id,
        company_id=m.company_id,
        owner_user_id=m.owner_user_id,
        phone=m.phone,
        status=NumberStatus(m.status),
        status_changed_at=m.status_changed_at,
        instance_name=m.instance_name,
        disconnect_reason=DisconnectReason(m.disconnect_reason) if m.disconnect_reason else None,
        disconnected_by=m.disconnected_by,
        last_confirmed_at=m.last_confirmed_at,
        down_since=m.down_since,
        message_events_enabled=m.message_events_enabled,
    )


def _copy_number(number: WhatsAppNumber, m: WhatsAppNumberModel) -> None:
    m.status = number.status.value
    m.status_changed_at = number.status_changed_at
    m.instance_name = number.instance_name
    m.disconnect_reason = number.disconnect_reason.value if number.disconnect_reason else None
    m.disconnected_by = number.disconnected_by
    m.last_confirmed_at = number.last_confirmed_at
    m.down_since = number.down_since
    m.message_events_enabled = number.message_events_enabled


def _attempt(m: ConnectionAttemptModel) -> ConnectionAttempt:
    return ConnectionAttempt(
        id=m.id,
        company_id=m.company_id,
        user_id=m.user_id,
        instance_name=m.instance_name,
        expires_at=m.expires_at,
        status=AttemptStatus(m.status),
        failure=AttemptFailure(m.failure) if m.failure else None,
        number_id=m.number_id,
        instance_removed=m.instance_removed,
    )


class SqlNumberRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    @asynccontextmanager
    async def _guarded(self) -> AsyncIterator[None]:
        """Ponto de salvamento: a corrida pelo telefone não pode invalidar a transação.

        A alteração precisa ocorrer dentro dele, porque `begin_nested` faz flush ao entrar.
        """
        try:
            async with self._db.begin_nested():
                yield
                await self._db.flush()
        except IntegrityError as error:
            if CONNECTED_INDEX in str(error.orig):
                raise NumberAlreadyConnected() from error
            raise

    async def add(self, number: WhatsAppNumber) -> None:
        model = WhatsAppNumberModel(
            id=number.id,
            company_id=number.company_id,
            owner_user_id=number.owner_user_id,
            phone=number.phone,
        )
        _copy_number(number, model)
        async with self._guarded():
            self._db.add(model)

    async def list_by_owner(self, owner_user_id: UUID) -> Sequence[WhatsAppNumber]:
        return await self._list(WhatsAppNumberModel.owner_user_id == owner_user_id)

    async def get_by_owner_and_phone(
        self, owner_user_id: UUID, phone: str
    ) -> WhatsAppNumber | None:
        model = await self._one(
            WhatsAppNumberModel.owner_user_id == owner_user_id, WhatsAppNumberModel.phone == phone
        )
        return _number(model) if model else None

    async def count_connected(self, owner_user_id: UUID) -> int:
        count = await self._db.scalar(
            select(func.count())
            .select_from(WhatsAppNumberModel)
            .where(
                WhatsAppNumberModel.owner_user_id == owner_user_id,
                WhatsAppNumberModel.status == NumberStatus.CONNECTED.value,
            )
        )
        return count or 0

    async def is_connected_elsewhere(self, phone: str, owner_user_id: UUID) -> bool:
        model = await self._one(
            WhatsAppNumberModel.phone == phone,
            WhatsAppNumberModel.status == NumberStatus.CONNECTED.value,
            WhatsAppNumberModel.owner_user_id != owner_user_id,
        )
        return model is not None

    async def get_for_owner(self, owner_user_id: UUID, number_id: UUID) -> WhatsAppNumber | None:
        model = await self._one(
            WhatsAppNumberModel.owner_user_id == owner_user_id,
            WhatsAppNumberModel.id == number_id,
        )
        return _number(model) if model else None

    async def get_in_company(self, company_id: UUID, number_id: UUID) -> WhatsAppNumber | None:
        model = await self._one(
            WhatsAppNumberModel.company_id == company_id, WhatsAppNumberModel.id == number_id
        )
        return _number(model) if model else None

    async def get_by_instance(self, instance_name: str) -> WhatsAppNumber | None:
        model = await self._one(WhatsAppNumberModel.instance_name == instance_name)
        return _number(model) if model else None

    async def list_by_company(self, company_id: UUID) -> Sequence[WhatsAppNumber]:
        return await self._list(WhatsAppNumberModel.company_id == company_id)

    async def list_connected(self) -> Sequence[WhatsAppNumber]:
        return await self._list(WhatsAppNumberModel.status == NumberStatus.CONNECTED.value)

    async def list_without_message_events(self) -> Sequence[WhatsAppNumber]:
        return await self._list(
            WhatsAppNumberModel.status == NumberStatus.CONNECTED.value,
            WhatsAppNumberModel.message_events_enabled.is_(False),
        )

    async def list_with_stale_instance(self) -> Sequence[WhatsAppNumber]:
        return await self._list(
            WhatsAppNumberModel.status == NumberStatus.DISCONNECTED.value,
            WhatsAppNumberModel.instance_name.is_not(None),
        )

    async def disconnect_for_user(
        self, user_id: UUID, reason: DisconnectReason, now: datetime, by: UUID | None
    ) -> None:
        await self._disconnect(WhatsAppNumberModel.owner_user_id == user_id, reason, now, by)

    async def disconnect_for_company(
        self, company_id: UUID, reason: DisconnectReason, now: datetime
    ) -> None:
        await self._disconnect(WhatsAppNumberModel.company_id == company_id, reason, now, None)

    async def _disconnect(
        self,
        scope: ColumnElement[bool],
        reason: DisconnectReason,
        now: datetime,
        by: UUID | None,
    ) -> None:
        await self._db.execute(
            update(WhatsAppNumberModel)
            .where(scope, WhatsAppNumberModel.status == NumberStatus.CONNECTED.value)
            .values(
                status=NumberStatus.DISCONNECTED.value,
                status_changed_at=now,
                disconnect_reason=reason.value,
                disconnected_by=by,
                down_since=None,
            )
        )

    async def _list(self, *conditions: ColumnElement[bool]) -> Sequence[WhatsAppNumber]:
        rows = await self._db.scalars(
            select(WhatsAppNumberModel).where(*conditions).order_by(WhatsAppNumberModel.created_at)
        )
        return [_number(m) for m in rows]

    async def save(self, number: WhatsAppNumber) -> None:
        async with self._guarded():
            model = await self._db.get_one(WhatsAppNumberModel, number.id)
            _copy_number(number, model)

    async def _one(self, *conditions: ColumnElement[bool]) -> WhatsAppNumberModel | None:
        return await self._db.scalar(select(WhatsAppNumberModel).where(*conditions))


class SqlAttemptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, attempt: ConnectionAttempt) -> None:
        self._db.add(
            ConnectionAttemptModel(
                id=attempt.id,
                company_id=attempt.company_id,
                user_id=attempt.user_id,
                instance_name=attempt.instance_name,
                status=attempt.status.value,
                expires_at=attempt.expires_at,
            )
        )
        await self._db.flush()

    async def get_for_user(self, user_id: UUID, attempt_id: UUID) -> ConnectionAttempt | None:
        model = await self._fresh(
            ConnectionAttemptModel.user_id == user_id, ConnectionAttemptModel.id == attempt_id
        )
        return _attempt(model) if model else None

    async def get_by_instance(self, instance_name: str) -> ConnectionAttempt | None:
        model = await self._fresh(ConnectionAttemptModel.instance_name == instance_name)
        return _attempt(model) if model else None

    async def list_pending_by_user(self, user_id: UUID) -> Sequence[ConnectionAttempt]:
        rows = await self._db.scalars(
            select(ConnectionAttemptModel).where(
                ConnectionAttemptModel.user_id == user_id,
                ConnectionAttemptModel.status == AttemptStatus.PENDING.value,
            )
        )
        return [_attempt(m) for m in rows]

    async def save(self, attempt: ConnectionAttempt) -> None:
        model = await self._db.get_one(ConnectionAttemptModel, attempt.id)
        model.status = attempt.status.value
        model.failure = attempt.failure.value if attempt.failure else None
        model.number_id = attempt.number_id
        model.instance_removed = attempt.instance_removed
        await self._db.flush()

    async def list_expired(self, now: datetime) -> Sequence[ConnectionAttempt]:
        rows = await self._db.scalars(
            select(ConnectionAttemptModel).where(
                ConnectionAttemptModel.status == AttemptStatus.PENDING.value,
                ConnectionAttemptModel.expires_at <= now,
            )
        )
        return [_attempt(m) for m in rows]

    async def list_with_stale_instance(self) -> Sequence[ConnectionAttempt]:
        closed = (
            AttemptStatus.REJECTED.value,
            AttemptStatus.EXPIRED.value,
            AttemptStatus.CANCELLED.value,
        )
        rows = await self._db.scalars(
            select(ConnectionAttemptModel).where(
                ConnectionAttemptModel.status.in_(closed),
                ConnectionAttemptModel.instance_removed.is_(False),
            )
        )
        return [_attempt(m) for m in rows]

    async def cancel_pending_for_user(self, user_id: UUID) -> None:
        await self._cancel_pending(ConnectionAttemptModel.user_id == user_id)

    async def cancel_pending_for_company(self, company_id: UUID) -> None:
        await self._cancel_pending(ConnectionAttemptModel.company_id == company_id)

    async def _cancel_pending(self, scope: ColumnElement[bool]) -> None:
        await self._db.execute(
            update(ConnectionAttemptModel)
            .where(scope, ConnectionAttemptModel.status == AttemptStatus.PENDING.value)
            .values(status=AttemptStatus.CANCELLED.value)
        )

    async def _fresh(self, *conditions: ColumnElement[bool]) -> ConnectionAttemptModel | None:
        """Relê do banco: depois de travar a pessoa, a situação pode ter mudado."""
        return await self._db.scalar(
            select(ConnectionAttemptModel)
            .where(*conditions)
            .execution_options(populate_existing=True)
        )
