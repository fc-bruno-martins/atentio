"""Fiação da aplicação: rotas, erros e ciclo de vida."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.endpoints import health
from app.api.v1.errors import register_error_handlers
from app.api.v1.router import api_router
from app.container import Container, build_container
from app.core.config import Settings, load_settings
from app.core.logging import configure_logging


def create_app(container: Container) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield
        await container.close()

    app = FastAPI(title="Atentio API", version="0.2.0", lifespan=lifespan)
    app.state.container = container
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(api_router)
    return app


def build_app() -> FastAPI:
    settings = load_settings(Settings)
    configure_logging(settings.log_level)
    return create_app(build_container(settings))
