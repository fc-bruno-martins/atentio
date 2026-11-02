import asyncio
from datetime import UTC, datetime, timedelta

import pytest

from app.container import Container
from app.core.database import session_scope
from app.domain.actor import Actor
from app.domain.company import Company
from app.domain.errors import LastAdmin
from app.domain.session import AuthSession
from app.domain.user import Role, User
from app.repositories.identity import (
    SqlCompanyRepository,
    SqlSessionRepository,
    SqlUserRepository,
)
from app.services.users import UserAdminService

pytestmark = pytest.mark.integration
NOW = datetime(2026, 11, 2, 12, tzinfo=UTC)


async def _seed(container: Container) -> tuple[Company, User, User]:
    company = Company.create("Acme")
    first = User.create(
        company_id=company.id,
        email="a@acme.com",
        name="Admin A",
        password_hash="h",
        role=Role.COMPANY_ADMIN,
    )
    second = User.create(
        company_id=company.id,
        email="b@acme.com",
        name="Admin B",
        password_hash="h",
        role=Role.COMPANY_ADMIN,
    )
    async with session_scope(container.session_factory) as db:
        await SqlCompanyRepository(db).add(company)
        users = SqlUserRepository(db)
        await users.add(first)
        await users.add(second)
    return company, first, second


async def test_email_ignora_maiusculas(container: Container) -> None:
    _, first, _ = await _seed(container)

    async with session_scope(container.session_factory) as db:
        found = await SqlUserRepository(db).get_by_email("A@ACME.com")

    assert found is not None
    assert found.id == first.id


async def test_usuario_nao_e_encontrado_em_outra_empresa(container: Container) -> None:
    _, first, _ = await _seed(container)
    other = Company.create("Outra")

    async with session_scope(container.session_factory) as db:
        await SqlCompanyRepository(db).add(other)
        assert await SqlUserRepository(db).get_in_company(other.id, first.id) is None


async def test_revogar_sessoes_da_empresa(container: Container) -> None:
    company, first, _ = await _seed(container)
    session = AuthSession.open(user_id=first.id, token_hash="t", now=NOW, ttl=timedelta(hours=1))

    async with session_scope(container.session_factory) as db:
        await SqlSessionRepository(db).add(session)
    async with session_scope(container.session_factory) as db:
        await SqlSessionRepository(db).revoke_for_company(company.id, NOW)
    async with session_scope(container.session_factory) as db:
        loaded = await SqlSessionRepository(db).get_by_token_hash("t")

    assert loaded is not None
    assert loaded.revoked_at == NOW


async def test_dois_admins_nao_se_desativam_ao_mesmo_tempo(container: Container) -> None:
    company, first, second = await _seed(container)

    async def deactivate(actor_user: User, target: User) -> None:
        async with session_scope(container.session_factory) as db:
            service = UserAdminService(
                SqlUserRepository(db),
                SqlCompanyRepository(db),
                SqlSessionRepository(db),
                container.clock,
            )
            actor = Actor(actor_user.id, target.id, Role.COMPANY_ADMIN, company.id)
            await service.update(actor, target.id, is_active=False)

    results = await asyncio.gather(
        deactivate(first, second), deactivate(second, first), return_exceptions=True
    )

    assert sum(isinstance(r, LastAdmin) for r in results) == 1
    async with session_scope(container.session_factory) as db:
        assert await SqlUserRepository(db).count_active_admins(company.id) == 1
