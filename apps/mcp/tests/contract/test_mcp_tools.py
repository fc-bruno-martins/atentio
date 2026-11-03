from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import httpx
import pytest
from starlette.applications import Starlette

from app.core.config import Settings
from app.domain.ports import BackendError
from app.infrastructure.backend import BackendMessageReader
from app.main import create_app

pytestmark = pytest.mark.contract
HEADERS = {
    "Authorization": "Bearer token-da-pessoa",
    "Accept": "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-06-18",
}


class FakeReader:
    def __init__(self) -> None:
        self.tokens: list[str] = []

    async def list_conversations(self, token: str) -> Any:
        self.tokens.append(token)
        return [{"id": "c1", "name": "Ana"}]

    async def read_messages(self, token: str, conversation_id: str, *_: Any) -> Any:
        raise BackendError("Conversa não encontrada.")

    async def search(self, token: str, query: str, *_: Any) -> Any:
        return []


@asynccontextmanager
async def running(reader: FakeReader) -> AsyncIterator[httpx.AsyncClient]:
    app: Starlette = create_app(Settings(backend_url="http://backend"), reader)
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://localhost:8001") as http:
            yield http


async def _rpc(http: httpx.AsyncClient, method: str, params: dict[str, Any]) -> dict[str, Any]:
    response = await http.post(
        "/mcp",
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        headers=HEADERS,
    )
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


async def test_sem_token_responde_401() -> None:
    async with running(FakeReader()) as client:
        response = await client.post("/mcp", json={})
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


async def test_expoe_so_ferramentas_de_leitura() -> None:
    async with running(FakeReader()) as client:
        tools = (await _rpc(client, "tools/list", {}))["result"]["tools"]
    assert {t["name"] for t in tools} == {"list_conversations", "read_messages", "search_messages"}
    assert all(t["annotations"]["readOnlyHint"] for t in tools)


async def test_repassa_o_token_ao_backend() -> None:
    reader = FakeReader()
    async with running(reader) as client:
        body = await _rpc(client, "tools/call", {"name": "list_conversations", "arguments": {}})
    assert not body["result"].get("isError")
    assert reader.tokens == ["token-da-pessoa"]


async def test_erro_do_backend_chega_sem_detalhes() -> None:
    async with running(FakeReader()) as client:
        body = await _rpc(
            client, "tools/call", {"name": "read_messages", "arguments": {"conversation_id": "x"}}
        )
    assert body["result"]["isError"]
    assert "Conversa não encontrada" in body["result"]["content"][0]["text"]


def _backend(handler: Any) -> BackendMessageReader:
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return BackendMessageReader(http, "http://backend")


async def test_cliente_repassa_filtros_e_ignora_vazios() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=[])

    await _backend(handler).search("t", "reuniao", "2026-11-01T00:00:00Z", None)
    assert seen[0].url.path == "/api/v1/mcp/search"
    assert seen[0].url.params["q"] == "reuniao"
    assert "until" not in seen[0].url.params
    assert seen[0].headers["authorization"] == "Bearer t"


@pytest.mark.parametrize(
    ("status", "message"),
    [(401, "Token inválido"), (404, "não encontrada"), (500, "indisponível")],
)
async def test_erros_viram_mensagens_seguras(status: int, message: str) -> None:
    with pytest.raises(BackendError, match=message):
        await _backend(lambda _: httpx.Response(status, json={})).list_conversations("t")


async def test_backend_fora() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sem rede")

    with pytest.raises(BackendError, match="indisponível"):
        await _backend(handler).list_conversations("t")
