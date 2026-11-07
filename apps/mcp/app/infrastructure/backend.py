"""Lê dados pelo backend, repassando o token da pessoa. O MCP não acessa o banco."""

from typing import Any

import httpx

from app.domain.ports import BackendError

MESSAGES = {
    401: "Token inválido ou revogado. Gere outro em Meu perfil.",
    404: "Conversa não encontrada.",
    422: "Parâmetros inválidos. Use datas ISO 8601 e busca de 2 a 200 caracteres.",
}
UNAVAILABLE = "A plataforma está indisponível no momento."


class BackendMessageReader:
    def __init__(self, client: httpx.AsyncClient, base_url: str) -> None:
        self._client = client
        self._base = f"{base_url.rstrip('/')}/api/v1/mcp"

    async def list_conversations(self, token: str, channel: str | None) -> Any:
        return await self._get(token, "/conversations", {"channel": channel})

    async def read_messages(
        self, token: str, conversation_id: str, since: str | None, until: str | None, limit: int
    ) -> Any:
        params = {"since": since, "until": until, "limit": limit}
        return await self._get(token, f"/conversations/{conversation_id}/messages", params)

    async def search(self, token: str, query: str, since: str | None, until: str | None) -> Any:
        return await self._get(token, "/search", {"q": query, "since": since, "until": until})

    async def _get(self, token: str, path: str, params: dict[str, Any]) -> Any:
        try:
            response = await self._client.get(
                f"{self._base}{path}",
                params={k: v for k, v in params.items() if v is not None},
                headers={"Authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as error:
            raise BackendError(UNAVAILABLE) from error
        if not response.is_success:
            raise BackendError(MESSAGES.get(response.status_code, UNAVAILABLE))
        return response.json()
