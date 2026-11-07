"""Captura, leitura e expurgo de mensagens."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.core.logging import get_logger
from app.domain.actor import Actor
from app.domain.errors import InvalidPeriod, InvalidValue, NotFound, WhatsAppUnavailable
from app.domain.message import Conversation, IncomingMessage, Message, SearchHit
from app.domain.ports import MessageRepository, NumberRepository, WhatsAppGateway

log = get_logger(__name__)
GROUP_NAMES_PER_ROUND = 5
MAX_MESSAGES = 500
MAX_SEARCH_HITS = 50


@dataclass(frozen=True)
class ConversationMessages:
    conversation: Conversation
    messages: Sequence[Message]


class MessageService:
    def __init__(
        self,
        messages: MessageRepository,
        numbers: NumberRepository,
        gateway: WhatsAppGateway,
        clock: Callable[[], datetime],
        retention_days: int,
    ) -> None:
        self._messages = messages
        self._numbers = numbers
        self._gateway = gateway
        self._clock = clock
        self._retention_days = retention_days

    async def capture(self, instance_name: str, messages: Sequence[IncomingMessage]) -> int:
        number = await self._numbers.get_by_instance(instance_name)
        if number is None or not number.is_connected:
            return 0
        stored = 0
        for message in messages:
            if await self._messages.store(number, message):
                stored += 1
        return stored

    async def list_conversations(
        self,
        actor: Actor,
        *,
        channel: str | None = None,
        connection_id: UUID | None = None,
    ) -> Sequence[Conversation]:
        return await self._messages.list_conversations(
            actor.user_id, channel=channel, connection_id=connection_id
        )

    async def read(
        self,
        actor: Actor,
        conversation_id: UUID,
        *,
        since: datetime | None = None,
        until: datetime | None = None,
        limit: int = MAX_MESSAGES,
    ) -> ConversationMessages:
        if since is not None and until is not None and since >= until:
            raise InvalidPeriod()
        conversation = await self._messages.get_conversation(actor.user_id, conversation_id)
        if conversation is None:
            raise NotFound()
        messages = await self._messages.list_messages(
            conversation.id, since=since, until=until, limit=min(limit, MAX_MESSAGES)
        )
        return ConversationMessages(conversation, messages)

    async def search(
        self,
        actor: Actor,
        query: str,
        *,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> Sequence[SearchHit]:
        if not 2 <= len(query.strip()) <= 200:
            raise InvalidValue("A busca deve ter de 2 a 200 caracteres.")
        if since is not None and until is not None and since >= until:
            raise InvalidPeriod()
        return await self._messages.search(
            actor.user_id, query.strip(), since=since, until=until, limit=MAX_SEARCH_HITS
        )

    async def purge_expired(self) -> int:
        return await self._messages.purge_expired(self._clock(), self._retention_days)

    async def fill_group_names(self) -> None:
        """Poucos por rodada, para não gerar volume de consultas no número da pessoa."""
        for group in await self._messages.list_unnamed_groups(GROUP_NAMES_PER_ROUND):
            try:
                name = await self._gateway.get_group_name(group.instance_name, group.remote_jid)
            except WhatsAppUnavailable:
                log.warning("nome_de_grupo_indisponivel")
                return
            if name:
                await self._messages.set_conversation_name(group.conversation_id, name)
