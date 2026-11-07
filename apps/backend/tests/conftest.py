"""Fixtures: PostgreSQL e Redis reais via testcontainers (constitution VI)."""

import os
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass
from pathlib import Path

import httpx
import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from sqlalchemy import text
from testcontainers.community.postgres import PostgresContainer
from testcontainers.community.redis import RedisContainer

from app.container import Container, build_container
from app.core.config import Settings
from app.core.database import session_scope
from app.domain.user import Role, User
from app.main import create_app
from app.repositories.identity import SqlUserRepository
from tests.fakes import FakeAnalysisModel, FakeEmail, FakeWhatsApp

ALEMBIC_INI = Path(__file__).parents[1] / "alembic.ini"
WEBHOOK_SECRET = "segredo-do-webhook"
PASSWORD = "senha-muito-boa"


def alembic_config() -> Config:
    return Config(str(ALEMBIC_INI))


@pytest.fixture(scope="session")
def postgres_url() -> Iterator[str]:
    with PostgresContainer("postgres:17-alpine", driver="asyncpg") as pg:
        url = pg.get_connection_url()
        previous = os.environ.get("DATABASE_URL")
        os.environ["DATABASE_URL"] = url
        command.upgrade(alembic_config(), "head")
        yield url
        if previous is None:
            del os.environ["DATABASE_URL"]
        else:
            os.environ["DATABASE_URL"] = previous


@pytest.fixture(scope="session")
def redis_url() -> Iterator[str]:
    with RedisContainer("redis:7-alpine") as container:
        host = container.get_container_host_ip()
        port = container.get_exposed_port(6379)
        yield f"redis://{host}:{port}/0"


@pytest.fixture
async def container(postgres_url: str, redis_url: str) -> AsyncIterator[Container]:
    settings = Settings(
        database_url=postgres_url,
        redis_url=redis_url,
        evolution_api_url="http://evolution.invalid",
        evolution_api_key="chave",  # type: ignore[arg-type]
        evolution_webhook_secret=WEBHOOK_SECRET,  # type: ignore[arg-type]
        evolution_webhook_url="http://backend.invalid/hook",
        internal_api_token="token-interno",  # type: ignore[arg-type]
        openrouter_default_model="modelo/padrao",
        mcp_url="http://mcp.invalid",
        public_app_url="http://app.test",
        smtp_host="smtp.invalid",
        smtp_from="atentio@test",
    )
    built = build_container(settings)
    built.email = FakeEmail()
    built.whatsapp = FakeWhatsApp()
    built.analysis_model = FakeAnalysisModel()
    async with built.engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE api_tokens, analyses, analysis_prompts, user_ai_settings, "
                "company_settings, "
                "messages, conversations, connection_attempts, channel_connections, "
                "password_resets, sessions, invitations, users, companies CASCADE"
            )
        )
    await built.redis.flushdb()
    yield built
    await built.close()


@pytest.fixture
def app(container: Container) -> FastAPI:
    return create_app(container)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://backend") as http:
        yield http


@dataclass
class Person:
    id: str
    email: str
    headers: dict[str, str]


class Api:
    """Atalhos para montar cenários pela própria API."""

    def __init__(self, client: httpx.AsyncClient, container: Container) -> None:
        self.client = client
        self.container = container
        self.email: FakeEmail = container.email  # type: ignore[assignment]
        self.whatsapp: FakeWhatsApp = container.whatsapp  # type: ignore[assignment]
        self.model: FakeAnalysisModel = container.analysis_model  # type: ignore[assignment]

    async def login(self, email: str, password: str = PASSWORD) -> Person:
        response = await self.client.post(
            "/api/v1/auth/login", json={"email": email, "password": password}
        )
        assert response.status_code == 200, response.text
        body = response.json()
        return Person(body["user"]["id"], email, {"Authorization": f"Bearer {body['token']}"})

    async def platform_admin(self, email: str = "root@atentio.com") -> Person:
        async with session_scope(self.container.session_factory) as db:
            await SqlUserRepository(db).add(
                User.create(
                    company_id=None,
                    email=email,
                    name="Root",
                    password_hash=await self.container.hasher.hash(PASSWORD),
                    role=Role.PLATFORM_ADMIN,
                )
            )
        return await self.login(email)

    def last_token(self) -> str:
        return self.email.invitations[-1]["url"].split("token=")[1]

    async def accept(self, name: str = "Pessoa Teste") -> dict[str, object]:
        response = await self.client.post(
            "/api/v1/invitations/accept",
            json={"token": self.last_token(), "name": name, "password": PASSWORD},
        )
        assert response.status_code == 200, response.text
        return response.json()

    async def company(self, root: Person, name: str, admin_email: str) -> tuple[str, Person]:
        response = await self.client.post(
            "/api/v1/companies",
            json={"name": name, "admin_email": admin_email},
            headers=root.headers,
        )
        assert response.status_code == 201, response.text
        await self.accept("Admin")
        return response.json()["id"], await self.login(admin_email)

    async def member(self, admin: Person, email: str, role: str = "user") -> Person:
        response = await self.client.post(
            "/api/v1/company-invitations",
            json={"email": email, "role": role},
            headers=admin.headers,
        )
        assert response.status_code == 201, response.text
        await self.accept()
        return await self.login(email)


@pytest.fixture
def api(client: httpx.AsyncClient, container: Container) -> Api:
    return Api(client, container)
