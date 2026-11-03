"""Implementa o port de mensagens. Models do ORM não saem deste módulo."""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ColumnElement, DateTime, delete, exists, func, literal, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.domain.message import (
    Conversation,
    ConversationKind,
    IncomingMessage,
    Message,
    MessageType,
    SearchHit,
    UnnamedGroup,
)
from app.domain.number import WhatsAppNumber
from app.models import (
    AnalysisModelRow,
    CompanySettingsModel,
    ConversationModel,
    MessageModel,
    WhatsAppNumberModel,
)

MAX_CONVERSATIONS = 200


def _conversation(m: ConversationModel) -> Conversation:
    return Conversation(
        id=m.id,
        number_id=m.number_id,
        remote_jid=m.remote_jid,
        kind=ConversationKind(m.kind),
        name=m.name,
        last_message_at=m.last_message_at,
        owner_user_id=m.owner_user_id,
    )


def _message(m: MessageModel) -> Message:
    return Message(
        id=m.id,
        conversation_id=m.conversation_id,
        from_me=m.from_me,
        sender_name=m.sender_name,
        type=MessageType(m.type),
        text=m.text,
        sent_at=m.sent_at,
    )


class SqlMessageRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def store(self, number: WhatsAppNumber, message: IncomingMessage) -> bool:
        conversation = insert(ConversationModel).values(
            id=uuid4(),
            company_id=number.company_id,
            owner_user_id=number.owner_user_id,
            number_id=number.id,
            remote_jid=message.remote_jid,
            kind=message.kind.value,
            name=message.contact_name,
            last_message_at=message.sent_at,
        )
        conversation_id = await self._db.scalar(
            conversation.on_conflict_do_update(
                constraint="uq_conversations_number_jid",
                set_={
                    "last_message_at": func.greatest(
                        ConversationModel.last_message_at, conversation.excluded.last_message_at
                    ),
                    "name": func.coalesce(conversation.excluded.name, ConversationModel.name),
                },
            ).returning(ConversationModel.id)
        )
        stored = await self._db.scalar(
            insert(MessageModel)
            .values(
                id=uuid4(),
                company_id=number.company_id,
                owner_user_id=number.owner_user_id,
                number_id=number.id,
                conversation_id=conversation_id,
                external_id=message.external_id,
                from_me=message.from_me,
                sender_jid=message.sender_jid,
                sender_name=message.sender_name,
                type=message.type.value,
                text=message.text,
                sent_at=message.sent_at,
            )
            .on_conflict_do_nothing(constraint="uq_messages_number_external")
            .returning(MessageModel.id)
        )
        return stored is not None

    async def list_conversations(self, owner_user_id: UUID) -> Sequence[Conversation]:
        rows = await self._db.scalars(
            select(ConversationModel)
            .where(ConversationModel.owner_user_id == owner_user_id)
            .order_by(ConversationModel.last_message_at.desc())
            .limit(MAX_CONVERSATIONS)
        )
        return [_conversation(m) for m in rows]

    async def get_conversation(
        self, owner_user_id: UUID, conversation_id: UUID
    ) -> Conversation | None:
        model = await self._db.scalar(
            select(ConversationModel).where(
                ConversationModel.owner_user_id == owner_user_id,
                ConversationModel.id == conversation_id,
            )
        )
        return _conversation(model) if model else None

    async def list_messages(
        self,
        conversation_id: UUID,
        *,
        since: datetime | None,
        until: datetime | None,
        limit: int,
    ) -> Sequence[Message]:
        query = select(MessageModel).where(MessageModel.conversation_id == conversation_id)
        if since is not None:
            query = query.where(MessageModel.sent_at >= since)
        if until is not None:
            query = query.where(MessageModel.sent_at < until)
        rows = await self._db.scalars(query.order_by(MessageModel.sent_at.desc()).limit(limit))
        return [_message(m) for m in reversed(list(rows))]

    async def list_unnamed_groups(self, limit: int) -> Sequence[UnnamedGroup]:
        rows = await self._db.execute(
            select(
                ConversationModel.id,
                WhatsAppNumberModel.instance_name,
                ConversationModel.remote_jid,
            )
            .join(WhatsAppNumberModel, WhatsAppNumberModel.id == ConversationModel.number_id)
            .where(
                ConversationModel.kind == ConversationKind.GROUP.value,
                ConversationModel.name.is_(None),
                WhatsAppNumberModel.instance_name.is_not(None),
                WhatsAppNumberModel.status == "connected",
            )
            .limit(limit)
        )
        return [UnnamedGroup(row[0], str(row[1]), row[2]) for row in rows]

    async def set_conversation_name(self, conversation_id: UUID, name: str) -> None:
        await self._db.execute(
            update(ConversationModel)
            .where(ConversationModel.id == conversation_id)
            .values(name=name[:200])
        )

    async def search(
        self,
        owner_user_id: UUID,
        query: str,
        *,
        since: datetime | None,
        until: datetime | None,
        limit: int,
    ) -> Sequence[SearchHit]:
        statement = (
            select(MessageModel, ConversationModel)
            .join(ConversationModel, ConversationModel.id == MessageModel.conversation_id)
            .where(
                MessageModel.owner_user_id == owner_user_id,
                MessageModel.text.icontains(query, autoescape=True),
            )
        )
        if since is not None:
            statement = statement.where(MessageModel.sent_at >= since)
        if until is not None:
            statement = statement.where(MessageModel.sent_at < until)
        rows = await self._db.execute(statement.order_by(MessageModel.sent_at.desc()).limit(limit))
        return [SearchHit(_message(m), _conversation(c)) for m, c in rows]

    async def list_by_ids(
        self, conversation_id: UUID, message_ids: Sequence[UUID]
    ) -> Sequence[Message]:
        rows = await self._db.scalars(
            select(MessageModel)
            .where(
                MessageModel.conversation_id == conversation_id,
                MessageModel.id.in_(message_ids),
            )
            .order_by(MessageModel.sent_at)
        )
        return [_message(m) for m in rows]

    async def purge_expired(self, now: datetime, default_days: int) -> int:
        """Prazo da empresa, ou o padrão. Análises são derivados e vencem junto."""

        def cutoff(company_id: InstrumentedAttribute[UUID]) -> ColumnElement[datetime]:
            days = (
                select(CompanySettingsModel.retention_days)
                .where(CompanySettingsModel.company_id == company_id)
                .scalar_subquery()
            )
            interval = func.make_interval(0, 0, 0, func.coalesce(days, default_days))
            return literal(now, DateTime(timezone=True)) - interval

        purged = await self._db.scalars(
            delete(MessageModel)
            .where(MessageModel.sent_at < cutoff(MessageModel.company_id))
            .returning(MessageModel.id)
        )
        count = len(purged.all())
        await self._db.execute(
            delete(AnalysisModelRow).where(
                AnalysisModelRow.created_at < cutoff(AnalysisModelRow.company_id)
            )
        )
        await self._db.execute(
            delete(ConversationModel).where(
                ~exists().where(MessageModel.conversation_id == ConversationModel.id)
            )
        )
        return count
