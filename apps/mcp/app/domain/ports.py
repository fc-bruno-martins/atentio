"""Ports do MCP. O dado e as regras de acesso são do backend."""

from typing import Any, Protocol


class BackendError(Exception):
    """Falha com mensagem segura para mostrar ao cliente MCP."""


class MessageReader(Protocol):
    async def list_conversations(self, token: str, channel: str | None) -> Any: ...
    async def read_messages(
        self, token: str, conversation_id: str, since: str | None, until: str | None, limit: int
    ) -> Any: ...
    async def search(self, token: str, query: str, since: str | None, until: str | None) -> Any: ...
