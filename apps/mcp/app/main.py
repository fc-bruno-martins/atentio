"""Servidor MCP remoto (streamable HTTP) com token pessoal."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import Settings, load_settings
from app.core.logging import configure_logging
from app.domain.ports import MessageReader
from app.infrastructure.backend import BackendMessageReader
from app.tools.messages import INSTRUCTIONS, register_tools


class RequireBearer:
    """Recusa cedo quem não traz token. A validade é decidida pelo backend em cada chamada."""

    def __init__(self, app: ASGIApp) -> None:
        self._app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"].startswith("/mcp"):
            headers = dict(scope["headers"])
            if not headers.get(b"authorization", b"").startswith(b"Bearer "):
                response = JSONResponse(
                    {"error": "token_required"},
                    status_code=401,
                    headers={"WWW-Authenticate": "Bearer"},
                )
                await response(scope, receive, send)
                return
        await self._app(scope, receive, send)


def create_app(settings: Settings, reader: MessageReader | None = None) -> Starlette:
    client = httpx.AsyncClient(timeout=settings.backend_timeout_seconds)
    server: MCPServer = MCPServer(name="judite", version="0.3.0", instructions=INSTRUCTIONS)
    register_tools(server, reader or BackendMessageReader(client, settings.backend_url))

    async def health(_: Request) -> Response:
        return JSONResponse({"status": "ok"})

    server.custom_route("/health", methods=["GET"], include_in_schema=False)(health)

    allowed_hosts = [h.strip() for h in settings.mcp_allowed_hosts.split(",") if h.strip()]
    app = server.streamable_http_app(
        host="0.0.0.0",
        stateless_http=True,
        json_response=True,
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True, allowed_hosts=allowed_hosts
        ),
    )
    inner_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(instance: Starlette) -> AsyncIterator[None]:
        async with inner_lifespan(instance):
            yield
        await client.aclose()

    app.router.lifespan_context = lifespan
    app.add_middleware(RequireBearer)
    return app


def build_app() -> Starlette:
    settings = load_settings()
    configure_logging(settings.log_level)
    return create_app(settings)
