from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.actor import Actor
from app.domain.company import Company
from app.domain.errors import (
    EmailInUse,
    InvalidInvitation,
    InvalidValue,
    InvitationAlreadyPending,
    LastAdmin,
    NotFound,
)
from app.domain.invitation import InvitationStatus
from app.domain.number import AttemptStatus, ConnectionAttempt, DisconnectReason, WhatsAppNumber
from app.domain.session import AuthSession
from app.domain.user import Role, User
from app.services.companies import CompanyService
from app.services.invitations import InvitationService
from app.services.users import UserAdminService
from tests.fakes import (
    FakeAttempts,
    FakeCompanies,
    FakeEmail,
    FakeHasher,
    FakeInvitations,
    FakeNumbers,
    FakeSessions,
    FakeTokens,
    FakeUsers,
)

pytestmark = pytest.mark.unit
PASSWORD = "senha-muito-boa"


class World:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 2, 12, tzinfo=UTC)
        self.users = FakeUsers()
        self.companies = FakeCompanies()
        self.invitations = FakeInvitations()
        self.sessions = FakeSessions(self.users)
        self.email = FakeEmail()
        self.tokens = FakeTokens()
        self.numbers = FakeNumbers()
        self.attempts = FakeAttempts()
        self.company = Company.create("Acme")
        self.companies.items[self.company.id] = self.company
        self.invites = InvitationService(
            self.invitations,
            self.users,
            self.companies,
            FakeHasher(),
            self.tokens,
            self.email,
            lambda: self.now,
            timedelta(days=7),
            "http://app/",
        )
        self.admin_service = UserAdminService(
            self.users, self.companies, self.sessions, lambda: self.now, self.numbers, self.attempts
        )
        self.company_service = CompanyService(
            self.companies,
            self.sessions,
            self.invites,
            lambda: self.now,
            self.numbers,
            self.attempts,
        )

    def member(self, role: Role = Role.COMPANY_ADMIN, company: Company | None = None) -> User:
        user = User.create(
            company_id=(company or self.company).id,
            email=f"{uuid4().hex}@acme.com",
            name="Pessoa",
            password_hash="h",
            role=role,
        )
        self.users.items[user.id] = user
        return user

    def actor(self, user: User) -> Actor:
        return Actor(user.id, uuid4(), user.role, user.company_id)

    def session_of(self, user: User) -> AuthSession:
        session = AuthSession.open(
            user_id=user.id, token_hash=uuid4().hex, now=self.now, ttl=timedelta(hours=1)
        )
        self.sessions.items[session.id] = session
        return session

    async def invite(self, email: str = "novo@acme.com") -> None:
        await self.invites.invite(
            company=self.company, email=email, role=Role.USER, invited_by=uuid4()
        )

    @property
    def token(self) -> str:
        return self.email.invitations[-1]["url"].split("token=")[1]


async def test_convite_envia_link_com_a_url_publica() -> None:
    world = World()
    await world.invite("NOVO@acme.com")

    sent = world.email.invitations[0]
    assert sent["to"] == "novo@acme.com"
    assert sent["url"] == "http://app/convite?token=token-1"


async def test_falha_no_envio_nao_desfaz_o_convite() -> None:
    world = World()
    world.email.fail = True

    await world.invite()

    invitation = next(iter(world.invitations.items.values()))
    assert invitation.last_send_failed_at == world.now


async def test_email_de_conta_existente_e_recusado() -> None:
    world = World()
    user = world.member()

    with pytest.raises(EmailInUse):
        await world.invite(user.email)


async def test_convite_pendente_nao_duplica() -> None:
    world = World()
    await world.invite()

    with pytest.raises(InvitationAlreadyPending):
        await world.invite()


async def test_convite_pendente_expirado_pode_ser_substituido() -> None:
    world = World()
    await world.invite()
    world.now += timedelta(days=8)

    await world.invite()

    statuses = sorted(i.status.value for i in world.invitations.items.values())
    assert statuses == ["cancelled", "pending"]


async def test_reenvio_invalida_o_link_anterior() -> None:
    world = World()
    admin = world.member()
    await world.invite()
    first = world.token
    invitation = next(iter(world.invitations.items.values()))

    await world.invites.resend(world.actor(admin), invitation.id)

    with pytest.raises(InvalidInvitation):
        await world.invites.lookup(first)
    assert (await world.invites.lookup(world.token)).invitation.id == invitation.id


async def test_aceite_cria_conta_no_perfil_do_convite_e_vale_uma_vez() -> None:
    world = World()
    await world.invite()
    token = world.token

    user = await world.invites.accept(token, "Nova Pessoa", PASSWORD)

    assert user.company_id == world.company.id
    assert user.role is Role.USER
    assert user.password_hash == f"hash:{PASSWORD}"
    with pytest.raises(InvalidInvitation):
        await world.invites.accept(token, "Outra", PASSWORD)


async def test_aceite_recusa_senha_curta_expirado_e_empresa_inativa() -> None:
    world = World()
    await world.invite()
    token = world.token

    with pytest.raises(InvalidValue):
        await world.invites.accept(token, "Nome", "curta")
    world.company.deactivate()
    with pytest.raises(InvalidInvitation):
        await world.invites.accept(token, "Nome", PASSWORD)
    world.company.activate()
    world.now += timedelta(days=7)
    with pytest.raises(InvalidInvitation):
        await world.invites.accept(token, "Nome", PASSWORD)


async def test_cancelar_convite_de_outra_empresa_responde_inexistente() -> None:
    world = World()
    other = Company.create("Outra")
    world.companies.items[other.id] = other
    outsider = world.member(company=other)
    await world.invite()
    invitation = next(iter(world.invitations.items.values()))

    with pytest.raises(NotFound):
        await world.invites.cancel(world.actor(outsider), invitation.id)
    assert invitation.status is InvitationStatus.PENDING


async def test_ultimo_admin_nao_e_desativado_nem_rebaixado() -> None:
    world = World()
    admin = world.member()
    actor = world.actor(admin)

    with pytest.raises(LastAdmin):
        await world.admin_service.update(actor, admin.id, is_active=False)
    with pytest.raises(LastAdmin):
        await world.admin_service.update(actor, admin.id, role=Role.USER)


async def test_com_dois_admins_um_pode_ser_rebaixado() -> None:
    world = World()
    admin = world.member()
    other = world.member()

    updated = await world.admin_service.update(world.actor(admin), other.id, role=Role.USER)

    assert updated.role is Role.USER


async def test_desativar_usuario_encerra_as_sessoes() -> None:
    world = World()
    admin = world.member()
    user = world.member(Role.USER)
    session = world.session_of(user)

    await world.admin_service.update(world.actor(admin), user.id, is_active=False)

    assert not user.is_active
    assert not session.is_active(world.now)


async def test_admin_nao_alcanca_usuario_de_outra_empresa() -> None:
    world = World()
    other = Company.create("Outra")
    world.companies.items[other.id] = other
    outsider = world.member(company=other)
    admin = world.member()

    with pytest.raises(NotFound):
        await world.admin_service.update(world.actor(admin), outsider.id, is_active=False)
    assert outsider.is_active


async def test_criar_empresa_registra_convite_do_primeiro_admin() -> None:
    world = World()
    platform = Actor(uuid4(), uuid4(), Role.PLATFORM_ADMIN, None)

    created = await world.company_service.create(platform, "Nova", "admin@nova.com")

    assert created.invitation.role is Role.COMPANY_ADMIN
    assert created.invitation.company_id == created.company.id
    assert world.email.invitations[-1]["to"] == "admin@nova.com"


async def test_desativar_empresa_encerra_sessoes_e_reativar_mantem_dados() -> None:
    world = World()
    user = world.member(Role.USER)
    session = world.session_of(user)

    await world.company_service.update(world.company.id, is_active=False)
    assert not session.is_active(world.now)
    assert not world.company.is_active

    await world.company_service.update(world.company.id, is_active=True, name="Acme 2")
    assert world.company.is_active
    assert world.company.name == "Acme 2"


async def test_empresa_inexistente() -> None:
    with pytest.raises(NotFound):
        await World().company_service.update(uuid4(), name="Nada")


async def test_aceite_simultaneo_vira_convite_invalido(monkeypatch: pytest.MonkeyPatch) -> None:
    world = World()
    await world.invite()

    async def email_taken(_: User) -> None:
        raise EmailInUse()

    monkeypatch.setattr(world.users, "add", email_taken)
    with pytest.raises(InvalidInvitation):
        await world.invites.accept(world.token, "Nova Pessoa", PASSWORD)


def _number(world: World, user: User) -> WhatsAppNumber:
    number = WhatsAppNumber.connect(
        company_id=world.company.id,
        owner_user_id=user.id,
        phone="5511999999999",
        instance_name="i",
        now=world.now,
    )
    world.numbers.items[number.id] = number
    return number


def _attempt(world: World, user: User) -> ConnectionAttempt:
    attempt = ConnectionAttempt.start(
        company_id=world.company.id, user_id=user.id, now=world.now, ttl=timedelta(minutes=5)
    )
    world.attempts.items[attempt.id] = attempt
    return attempt


async def test_desativar_conta_desconecta_numeros_e_cancela_tentativas() -> None:
    world = World()
    admin = world.member()
    user = world.member(Role.USER)
    number, attempt = _number(world, user), _attempt(world, user)
    actor = Actor(admin.id, uuid4(), Role.COMPANY_ADMIN, world.company.id)

    await world.admin_service.update(actor, user.id, is_active=False)

    assert not number.is_connected
    assert number.disconnect_reason is DisconnectReason.ACCOUNT_DEACTIVATED
    assert number.disconnected_by == admin.id
    assert attempt.status is AttemptStatus.CANCELLED


async def test_reativar_conta_nao_reconecta() -> None:
    world = World()
    admin = world.member()
    user = world.member(Role.USER)
    number = _number(world, user)
    actor = Actor(admin.id, uuid4(), Role.COMPANY_ADMIN, world.company.id)

    await world.admin_service.update(actor, user.id, is_active=False)
    await world.admin_service.update(actor, user.id, is_active=True)

    assert not number.is_connected


async def test_desativar_empresa_desconecta_numeros() -> None:
    world = World()
    user = world.member(Role.USER)
    number, attempt = _number(world, user), _attempt(world, user)

    await world.company_service.update(world.company.id, is_active=False)

    assert number.disconnect_reason is DisconnectReason.COMPANY_DEACTIVATED
    assert attempt.status is AttemptStatus.CANCELLED
