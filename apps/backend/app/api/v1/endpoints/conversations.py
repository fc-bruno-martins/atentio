from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.v1.dependencies import CompanyMemberDep, MessageServiceDep
from app.domain.message import Conversation, Message
from app.schemas.conversations import (
    ConversationActivityOut,
    ConversationMessagesOut,
    ConversationOut,
    DayCountOut,
    MessageOut,
    OverviewOut,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])
overview_router = APIRouter(prefix="/overview", tags=["conversations"])


def conversation_out(conversation: Conversation) -> ConversationOut:
    return ConversationOut(
        id=conversation.id,
        connection_id=conversation.number_id,
        channel=conversation.channel,
        kind=conversation.kind.value,
        name=conversation.name,
        contact=conversation.remote_jid.split("@")[0],
        last_message_at=conversation.last_message_at,
    )


def message_out(message: Message) -> MessageOut:
    return MessageOut(
        id=message.id,
        from_me=message.from_me,
        sender_name=message.sender_name,
        type=message.type.value,
        text=message.text,
        sent_at=message.sent_at,
    )


@router.get("")
async def list_conversations(
    actor: CompanyMemberDep,
    service: MessageServiceDep,
    channel: str | None = None,
    connection_id: UUID | None = None,
) -> list[ConversationOut]:
    conversations = await service.list_conversations(
        actor, channel=channel, connection_id=connection_id
    )
    return [conversation_out(c) for c in conversations]


@router.get("/{conversation_id}/messages")
async def readconversation_out(
    conversation_id: UUID,
    actor: CompanyMemberDep,
    service: MessageServiceDep,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: Annotated[int, Query(gt=0, le=500)] = 500,
) -> ConversationMessagesOut:
    result = await service.read(actor, conversation_id, since=since, until=until, limit=limit)
    return ConversationMessagesOut(
        conversation=conversation_out(result.conversation),
        messages=[message_out(m) for m in result.messages],
    )


@overview_router.get("")
async def overview(
    actor: CompanyMemberDep,
    service: MessageServiceDep,
    tz: Annotated[str, Query(max_length=64)] = "UTC",
) -> OverviewOut:
    result = await service.overview(actor, tz)
    return OverviewOut(
        total_messages=result.total_messages,
        last_24h=result.last_24h,
        from_me=result.from_me,
        people=result.people,
        by_day=[DayCountOut(day=d.day, messages=d.messages) for d in result.by_day],
        conversations=[
            ConversationActivityOut(
                conversation_id=c.conversation_id, messages=c.messages, last_24h=c.last_24h
            )
            for c in result.conversations
        ],
    )
