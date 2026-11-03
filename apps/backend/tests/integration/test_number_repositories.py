from datetime import UTC, datetime, timedelta

import pytest

from app.container import Container
from app.core.database import session_scope
from app.domain.company import Company
from app.domain.errors import NumberAlreadyConnected
from app.domain.number import ConnectionAttempt, NumberStatus, WhatsAppNumber
from app.domain.user import Role, User
from app.repositories.identity import SqlCompanyRepository, SqlUserRepository
from app.repositories.numbers import SqlAttemptRepository, SqlNumberRepository

pytestmark = pytest.mark.integration
NOW = datetime(2026, 11, 2, 12, tzinfo=UTC)
PHONE = "5511999999999"


async def _seed(container: Container) -> tuple[Company, User, User]:
    company = Company.create("Acme")
    people = [
        User.create(
            company_id=company.id,
            email=f"{name}@acme.com",
            name=name,
            password_hash="h",
            role=Role.USER,
        )
        for name in ("Ana", "Bia")
    ]
    async with session_scope(container.session_factory) as db:
        await SqlCompanyRepository(db).add(company)
        for person in people:
            await SqlUserRepository(db).add(person)
    return company, people[0], people[1]


def _number(company: Company, owner: User, phone: str = PHONE) -> WhatsAppNumber:
    return WhatsAppNumber.connect(
        company_id=company.id, owner_user_id=owner.id, phone=phone, instance_name="i", now=NOW
    )


async def test_numero_ida_e_volta(container: Container) -> None:
    company, ana, _ = await _seed(container)
    number = _number(company, ana)
    async with session_scope(container.session_factory) as db:
        await SqlNumberRepository(db).add(number)
    async with session_scope(container.session_factory) as db:
        assert await SqlNumberRepository(db).list_by_owner(ana.id) == [number]


async def test_filtra_pelo_dono(container: Container) -> None:
    company, ana, bia = await _seed(container)
    async with session_scope(container.session_factory) as db:
        await SqlNumberRepository(db).add(_number(company, ana))
    async with session_scope(container.session_factory) as db:
        repo = SqlNumberRepository(db)
        assert await repo.list_by_owner(bia.id) == []
        assert await repo.count_connected(bia.id) == 0
        assert await repo.count_connected(ana.id) == 1
        assert await repo.get_by_owner_and_phone(bia.id, PHONE) is None
        assert await repo.is_connected_elsewhere(PHONE, bia.id)
        assert not await repo.is_connected_elsewhere(PHONE, ana.id)


async def test_corrida_pelo_telefone_nao_invalida_a_transacao(container: Container) -> None:
    company, ana, bia = await _seed(container)
    async with session_scope(container.session_factory) as db:
        await SqlNumberRepository(db).add(_number(company, ana))
    attempt = ConnectionAttempt.start(
        company_id=company.id, user_id=bia.id, now=NOW, ttl=timedelta(minutes=5)
    )
    async with session_scope(container.session_factory) as db:
        with pytest.raises(NumberAlreadyConnected):
            await SqlNumberRepository(db).add(_number(company, bia))
        await SqlAttemptRepository(db).add(attempt)
    async with session_scope(container.session_factory) as db:
        assert await SqlAttemptRepository(db).get_by_instance(attempt.instance_name) is not None


async def test_numero_desconectado_permite_outra_conta(container: Container) -> None:
    company, ana, bia = await _seed(container)
    first = _number(company, ana)
    async with session_scope(container.session_factory) as db:
        await SqlNumberRepository(db).add(first)
    first.status = NumberStatus.DISCONNECTED
    async with session_scope(container.session_factory) as db:
        await SqlNumberRepository(db).save(first)
    async with session_scope(container.session_factory) as db:
        await SqlNumberRepository(db).add(_number(company, bia))


async def test_tentativa_filtra_pela_pessoa(container: Container) -> None:
    company, ana, bia = await _seed(container)
    attempt = ConnectionAttempt.start(
        company_id=company.id, user_id=ana.id, now=NOW, ttl=timedelta(minutes=5)
    )
    async with session_scope(container.session_factory) as db:
        await SqlAttemptRepository(db).add(attempt)
    async with session_scope(container.session_factory) as db:
        repo = SqlAttemptRepository(db)
        assert await repo.get_for_user(bia.id, attempt.id) is None
        assert await repo.get_for_user(ana.id, attempt.id) == attempt
        assert await repo.list_pending_by_user(ana.id) == [attempt]
        assert await repo.list_pending_by_user(bia.id) == []
