from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.company import Company
from app.domain.errors import InvalidCredentials, LoginBlocked, NotAuthenticated
from app.domain.user import Role, User
from app.services.auth import AuthService
from tests.fakes import (
    FakeCompanies,
    FakeHasher,
    FakeSessions,
    FakeThrottle,
    FakeTokens,
    FakeUsers,
)

pytestmark = pytest.mark.unit
PASSWORD = "senha-muito-boa"
TTL = timedelta(hours=12)


@dataclass
class World:
    now: datetime = datetime(2026, 11, 2, 12, tzinfo=UTC)
    users: FakeUsers = field(default_factory=FakeUsers)
    companies: FakeCompanies = field(default_factory=FakeCompanies)
    sessions: FakeSessions = field(default_factory=FakeSessions)
    throttle: FakeThrottle = field(default_factory=FakeThrottle)

    @property
    def service(self) -> AuthService:
        return AuthService(
            self.users,
            self.companies,
            self.sessions,
            FakeHasher(),
            FakeTokens(),
            self.throttle,
            lambda: self.now,
            TTL,
            "hash:dummy",
        )

    async def user(self, *, company_active: bool = True) -> tuple[User, Company]:
        company = Company(uuid4(), "Acme", is_active=company_active)
        await self.companies.add(company)
        user = User.create(
            company_id=company.id,
            email="ana@acme.com",
            name="Ana",
            password_hash=f"hash:{PASSWORD}",
            role=Role.USER,
        )
        await self.users.add(user)
        return user, company


async def test_login_abre_sessao() -> None:
    world = World()
    user, _ = await world.user()

    opened = await world.service.login("ANA@acme.com", PASSWORD)

    assert opened.user.id == user.id
    assert opened.session.expires_at == world.now + TTL


async def test_falhas_de_login_tem_o_mesmo_erro() -> None:
    world = World()
    user, company = await world.user()

    with pytest.raises(InvalidCredentials):
        await world.service.login("ana@acme.com", "errada")
    with pytest.raises(InvalidCredentials):
        await world.service.login("ninguem@acme.com", PASSWORD)
    user.is_active = False
    with pytest.raises(InvalidCredentials):
        await world.service.login("ana@acme.com", PASSWORD)
    user.is_active = True
    company.deactivate()
    with pytest.raises(InvalidCredentials):
        await world.service.login("ana@acme.com", PASSWORD)


async def test_bloqueia_apos_cinco_falhas_mesmo_com_senha_certa() -> None:
    world = World()
    await world.user()
    for _ in range(5):
        with pytest.raises(InvalidCredentials):
            await world.service.login("ana@acme.com", "errada")

    with pytest.raises(LoginBlocked):
        await world.service.login("ana@acme.com", PASSWORD)


async def test_login_com_sucesso_zera_as_falhas() -> None:
    world = World()
    await world.user()
    with pytest.raises(InvalidCredentials):
        await world.service.login("ana@acme.com", "errada")

    await world.service.login("ana@acme.com", PASSWORD)

    assert world.throttle.failures == {}


async def test_autenticar_estende_a_sessao() -> None:
    world = World()
    await world.user()
    service = world.service
    opened = await service.login("ana@acme.com", PASSWORD)
    world.now += timedelta(hours=11)

    actor = await service.authenticate(opened.token)

    assert actor.user_id == opened.user.id
    assert opened.session.expires_at == world.now + TTL


async def test_sessao_expirada_nao_autentica() -> None:
    world = World()
    await world.user()
    service = world.service
    opened = await service.login("ana@acme.com", PASSWORD)
    world.now += TTL

    with pytest.raises(NotAuthenticated):
        await service.authenticate(opened.token)


async def test_conta_ou_empresa_desativada_perde_acesso_na_proxima_chamada() -> None:
    world = World()
    user, company = await world.user()
    service = world.service
    opened = await service.login("ana@acme.com", PASSWORD)

    user.is_active = False
    with pytest.raises(NotAuthenticated):
        await service.authenticate(opened.token)
    user.is_active = True
    company.deactivate()
    with pytest.raises(NotAuthenticated):
        await service.authenticate(opened.token)


async def test_logout_encerra_a_sessao() -> None:
    world = World()
    await world.user()
    service = world.service
    opened = await service.login("ana@acme.com", PASSWORD)

    await service.logout(opened.token)

    with pytest.raises(NotAuthenticated):
        await service.authenticate(opened.token)
