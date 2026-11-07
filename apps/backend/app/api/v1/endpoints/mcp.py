"""Tokens do MCP e leitura pelo serviço MCP. Só leitura, só dados do dono do token."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.v1.dependencies import (
    ApiTokenServiceDep,
    CompanyMemberDep,
    McpActorDep,
    MessageServiceDep,
)
from app.api.v1.endpoints.conversations import conversation_out, message_out
from app.domain.api_token import ApiToken
from app.schemas.conversations import ConversationMessagesOut, ConversationOut
from app.schemas.mcp import ApiTokenCreatedOut, ApiTokenIn, ApiTokenOut, SearchHitOut

tokens_router = APIRouter(prefix="/mcp-tokens", tags=["mcp"])
router = APIRouter(prefix="/mcp", tags=["mcp"])


def _token(token: ApiToken) -> ApiTokenOut:
    return ApiTokenOut(
        id=token.id,
        name=token.name,
        created_at=token.created_at,
        last_used_at=token.last_used_at,
    )


@tokens_router.get("")
async def list_tokens(actor: CompanyMemberDep, service: ApiTokenServiceDep) -> list[ApiTokenOut]:
    return [_token(t) for t in await service.list_tokens(actor)]


@tokens_router.post("", status_code=status.HTTP_201_CREATED)
async def create_token(
    data: ApiTokenIn, actor: CompanyMemberDep, service: ApiTokenServiceDep
) -> ApiTokenCreatedOut:
    created = await service.create(actor, data.name)
    return ApiTokenCreatedOut(**_token(created.token).model_dump(), token=created.plain)


@tokens_router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token(
    token_id: UUID, actor: CompanyMemberDep, service: ApiTokenServiceDep
) -> None:
    await service.revoke(actor, token_id)


@router.get("/conversations")
async def list_conversations(
    actor: McpActorDep, service: MessageServiceDep, channel: str | None = None
) -> list[ConversationOut]:
    return [conversation_out(c) for c in await service.list_conversations(actor, channel=channel)]


@router.get("/conversations/{conversation_id}/messages")
async def read_conversation(
    conversation_id: UUID,
    actor: McpActorDep,
    service: MessageServiceDep,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: Annotated[int, Query(gt=0, le=500)] = 200,
) -> ConversationMessagesOut:
    result = await service.read(actor, conversation_id, since=since, until=until, limit=limit)
    return ConversationMessagesOut(
        conversation=conversation_out(result.conversation),
        messages=[message_out(m) for m in result.messages],
    )


@router.get("/search")
async def search_messages(
    q: str,
    actor: McpActorDep,
    service: MessageServiceDep,
    since: datetime | None = None,
    until: datetime | None = None,
) -> list[SearchHitOut]:
    return [
        SearchHitOut(
            conversation=conversation_out(hit.conversation), message=message_out(hit.message)
        )
        for hit in await service.search(actor, q, since=since, until=until)
    ]
