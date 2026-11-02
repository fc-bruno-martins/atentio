"""Servidor MCP remoto (streamable HTTP). Tools e auth chegam na feature 007."""

from mcp.server.mcpserver import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import Settings, load_settings
from app.core.logging import configure_logging


def create_app(settings: Settings) -> Starlette:
    server: MCPServer = MCPServer(name="judite", version="0.1.0")

    async def health(_: Request) -> Response:
        return JSONResponse({"status": "ok"})

    server.custom_route("/health", methods=["GET"], include_in_schema=False)(health)

    allowed_hosts = [h.strip() for h in settings.mcp_allowed_hosts.split(",") if h.strip()]
    return server.streamable_http_app(
        host="0.0.0.0",
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True, allowed_hosts=allowed_hosts
        ),
    )


def build_app() -> Starlette:
    settings = load_settings()
    configure_logging(settings.log_level)
    return create_app(settings)
