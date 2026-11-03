from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.v1.dependencies import CompanyMemberDep, MessageServiceDep
from app.domain.message import Conversation, Message
from app.schemas.conversations import ConversationMessagesOut, ConversationOut, MessageOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


def conversation_out(conversation: Conversation) -> ConversationOut:
    return ConversationOut(
        id=conversation.id,
        number_id=conversation.number_id,
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
    actor: CompanyMemberDep, service: MessageServiceDep
) -> list[ConversationOut]:
    return [conversation_out(c) for c in await service.list_conversations(actor)]


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
