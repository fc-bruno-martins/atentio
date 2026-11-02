from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.actor import Actor
from app.domain.company import Company
from app.domain.errors import InvalidResetLink, InvalidValue, WrongPassword
from app.domain.session import AuthSession
from app.domain.user import Role, User
from app.services.account import AccountService, PasswordRecoveryService
from tests.fakes import (
    FakeCompanies,
    FakeHasher,
    FakeResets,
    FakeSessions,
    FakeTokens,
    FakeUsers,
)

pytestmark = pytest.mark.unit
OLD = "senha-antiga-boa"
NEW = "senha-nova-melhor"


class World:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 2, 12, tzinfo=UTC)
        self.users = FakeUsers()
        self.companies = FakeCompanies()
        self.sessions = FakeSessions(self.users)
        self.resets = FakeResets()
        self.company = Company.create("Acme")
        self.companies.items[self.company.id] = self.company
        self.user = User.create(
            company_id=self.company.id,
            email="ana@acme.com",
            name="Ana",
            password_hash=f"hash:{OLD}",
            role=Role.USER,
        )
        self.users.items[self.user.id] = self.user
        self.account = AccountService(
            self.users, self.companies, self.sessions, FakeHasher(), lambda: self.now
        )
        self.recovery = PasswordRecoveryService(
            self.users,
            self.companies,
            self.resets,
            self.sessions,
            FakeHasher(),
            FakeTokens(),
            lambda: self.now,
            timedelta(hours=1),
            "http://app",
        )

    def session(self) -> AuthSession:
        session = AuthSession.open(
            user_id=self.user.id, token_hash=uuid4().hex, now=self.now, ttl=timedelta(hours=1)
        )
        self.sessions.items[session.id] = session
        return session

    def actor(self, session: AuthSession) -> Actor:
        return Actor(self.user.id, session.id, self.user.role, self.user.company_id)


async def test_alterar_nome() -> None:
    world = World()

    profile = await world.account.rename(world.actor(world.session()), "Ana Maria")

    assert profile.user.name == "Ana Maria"
    assert profile.company == world.company


async def test_troca_de_senha_encerra_as_outras_sessoes() -> None:
    world = World()
    current, other = world.session(), world.session()

    await world.account.change_password(world.actor(current), OLD, NEW)

    assert world.user.password_hash == f"hash:{NEW}"
    assert current.is_active(world.now)
    assert not other.is_active(world.now)


async def test_troca_de_senha_exige_a_senha_atual_e_tamanho_minimo() -> None:
    world = World()
    actor = world.actor(world.session())

    with pytest.raises(WrongPassword):
        await world.account.change_password(actor, "errada", NEW)
    with pytest.raises(InvalidValue):
        await world.account.change_password(actor, OLD, "curta")


@pytest.mark.parametrize("cenario", ["inexistente", "inativa", "empresa_inativa"])
async def test_recuperacao_nao_gera_email_sem_conta_ativa(cenario: str) -> None:
    world = World()
    email = "ana@acme.com"
    if cenario == "inexistente":
        email = "ninguem@acme.com"
    if cenario == "inativa":
        world.user.is_active = False
    if cenario == "empresa_inativa":
        world.company.deactivate()

    assert await world.recovery.request(email) is None


async def test_recuperacao_troca_a_senha_e_encerra_todas_as_sessoes() -> None:
    world = World()
    session = world.session()
    email = await world.recovery.request("ANA@acme.com")
    assert email is not None
    token = email.url.split("token=")[1]

    await world.recovery.reset(token, NEW)

    assert world.user.password_hash == f"hash:{NEW}"
    assert not session.is_active(world.now)
    with pytest.raises(InvalidResetLink):
        await world.recovery.reset(token, NEW)


async def test_novo_pedido_invalida_o_link_anterior_e_prazo_expira() -> None:
    world = World()
    first = await world.recovery.request("ana@acme.com")
    second = await world.recovery.request("ana@acme.com")
    assert first and second

    with pytest.raises(InvalidResetLink):
        await world.recovery.reset(first.url.split("token=")[1], NEW)
    world.now += timedelta(hours=1)
    with pytest.raises(InvalidResetLink):
        await world.recovery.reset(second.url.split("token=")[1], NEW)
