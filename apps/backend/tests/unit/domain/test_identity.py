from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.domain.company import Company
from app.domain.errors import InvalidInvitation, InvalidResetLink, InvalidValue
from app.domain.invitation import Invitation, InvitationStatus
from app.domain.password_reset import PasswordReset
from app.domain.session import AuthSession
from app.domain.user import Role, User, normalize_email, validate_password

pytestmark = pytest.mark.unit
NOW = datetime(2026, 11, 2, 12, tzinfo=UTC)
TTL = timedelta(days=7)


def _user(role: Role = Role.USER, company: bool = True) -> User:
    return User.create(
        company_id=uuid4() if company else None,
        email="  Ana@Empresa.COM ",
        name="Ana",
        password_hash="h",
        role=role,
    )


def _invitation() -> Invitation:
    return Invitation.create(
        company_id=uuid4(),
        email="a@b.com",
        role=Role.USER,
        token_hash="t",
        now=NOW,
        ttl=TTL,
        invited_by=uuid4(),
    )


def test_email_e_normalizado() -> None:
    assert _user().email == "ana@empresa.com"
    assert normalize_email(" X@Y.z ") == "x@y.z"


def test_so_administrador_da_plataforma_existe_sem_empresa() -> None:
    assert _user(Role.PLATFORM_ADMIN, company=False).company_id is None
    with pytest.raises(InvalidValue):
        _user(Role.USER, company=False)
    with pytest.raises(InvalidValue):
        _user(Role.PLATFORM_ADMIN, company=True)


def test_nome_da_empresa_e_validado_e_limpo() -> None:
    assert Company.create("  Acme ").name == "Acme"
    with pytest.raises(InvalidValue):
        Company.create(" a ")
    with pytest.raises(InvalidValue):
        Company.create("x" * 121)


def test_empresa_ativa_e_desativa() -> None:
    company = Company.create("Acme")
    company.deactivate()
    assert not company.is_active
    company.activate()
    assert company.is_active


def test_senha_exige_doze_caracteres() -> None:
    validate_password("x" * 12)
    with pytest.raises(InvalidValue):
        validate_password("x" * 11)


def test_perfil_de_empresa_nao_vira_administrador_da_plataforma() -> None:
    with pytest.raises(InvalidValue):
        _user().change_role(Role.PLATFORM_ADMIN)


def test_convite_nao_aceita_perfil_de_plataforma() -> None:
    with pytest.raises(InvalidValue):
        Invitation.create(
            company_id=uuid4(),
            email="a@b.com",
            role=Role.PLATFORM_ADMIN,
            token_hash="t",
            now=NOW,
            ttl=TTL,
            invited_by=uuid4(),
        )


def test_convite_valido_e_aceito_uma_vez() -> None:
    invitation = _invitation()
    invitation.accept(NOW)

    assert invitation.status is InvitationStatus.ACCEPTED
    with pytest.raises(InvalidInvitation):
        invitation.accept(NOW)


def test_convite_expirado_nao_e_aceito() -> None:
    with pytest.raises(InvalidInvitation):
        _invitation().accept(NOW + TTL)


def test_convite_cancelado_nao_e_aceito_nem_renovado() -> None:
    invitation = _invitation()
    invitation.cancel()

    with pytest.raises(InvalidInvitation):
        invitation.accept(NOW)
    with pytest.raises(InvalidInvitation):
        invitation.renew("novo", NOW, TTL)


def test_reenvio_troca_o_token_e_o_prazo() -> None:
    invitation = _invitation()
    invitation.renew("novo", NOW + timedelta(days=1), TTL)

    assert invitation.token_hash == "novo"
    assert invitation.expires_at == NOW + timedelta(days=8)


def test_sessao_expira_estende_e_revoga() -> None:
    ttl = timedelta(hours=12)
    session = AuthSession.open(user_id=uuid4(), token_hash="t", now=NOW, ttl=ttl)

    assert session.is_active(NOW)
    assert not session.is_active(NOW + ttl)
    session.extend(NOW + timedelta(hours=11), ttl)
    assert session.is_active(NOW + timedelta(hours=22))
    session.revoke(NOW)
    assert not session.is_active(NOW)


def test_recuperacao_vale_uma_vez_e_expira() -> None:
    ttl = timedelta(hours=1)
    reset = PasswordReset.create(user_id=uuid4(), token_hash="t", now=NOW, ttl=ttl)
    reset.use(NOW)
    with pytest.raises(InvalidResetLink):
        reset.use(NOW)

    expired = PasswordReset.create(user_id=uuid4(), token_hash="t", now=NOW, ttl=ttl)
    with pytest.raises(InvalidResetLink):
        expired.use(NOW + ttl)
