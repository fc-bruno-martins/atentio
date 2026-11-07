"""Grava a empresa, a pessoa, as conexões, as conversas e as análises de demonstração.

Idempotente: cada execução apaga os dados de demonstração da pessoa e grava tudo de novo, com
horários relativos a agora. Dados que não são de demonstração não são tocados.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import create_engine, create_session_factory, session_scope
from app.demo.analyses import SCRIPTS, DemoClock, Script, ScriptedModel
from app.demo.conversations import SLACK, THREADS, WHATSAPP, Thread
from app.domain.actor import Actor
from app.domain.agents import DEFAULT_PRESET, EXTRACTOR_PRESET, initial_steps, preset_by_id
from app.domain.analysis import Analysis, AnalysisPrompt, AnalysisStatus
from app.domain.company import Company
from app.domain.errors import InvalidValue
from app.domain.number import DEMO_INSTANCE_PREFIX, NumberStatus
from app.domain.ports import PasswordHasher
from app.domain.user import Role, User, normalize_email, validate_password
from app.infrastructure.outputs import MockOutputGateway
from app.models.analyses import AnalysisModelRow, AnalysisPromptModel
from app.models.messages import ConversationModel, MessageModel
from app.models.numbers import ChannelConnectionModel
from app.repositories.analyses import SqlAnalysisRepository, SqlPromptRepository
from app.repositories.identity import SqlCompanyRepository, SqlUserRepository
from app.repositories.messages import SqlMessageRepository
from app.services.agents import AgentPipeline
from app.services.analyses import AgentJob
from app.services.publishing import PublishDecision, PublishingService

COMPANY_NAME = "AKCIT · Demonstração"
PERSON_NAME = "Pitch AKCIT"
WHATSAPP_ACCOUNT = "5562900000001"
SLACK_ACCOUNT = "akcit-demo.slack.com"
DEMO_INSTANCE = f"{DEMO_INSTANCE_PREFIX}akcit"

PROMPTS = (
    (
        "Quem está sem resposta?",
        "Liste as mensagens dos clientes que ainda estão sem resposta, "
        "da mais antiga para a mais recente.",
    ),
    (
        "Resumo da semana",
        "Resuma a semana com este cliente: assuntos, decisões, pendências e próximos passos.",
    ),
    (
        "Sinais de risco",
        "Aponte sinais de insatisfação, risco de cancelamento ou de renovação com este cliente.",
    ),
)


@dataclass(frozen=True)
class SeedResult:
    email: str
    conversations: int
    messages: int
    analyses: int


async def _person(db: AsyncSession, hasher: PasswordHasher, email: str, password: str) -> User:
    """Cria a empresa e a pessoa, ou reaproveita e redefine a senha."""
    users = SqlUserRepository(db)
    person = await users.get_by_email(normalize_email(email))
    password_hash = await hasher.hash(password)
    if person is None:
        company = Company.create(COMPANY_NAME)
        await SqlCompanyRepository(db).add(company)
        person = User.create(
            company_id=company.id,
            email=email,
            name=PERSON_NAME,
            password_hash=password_hash,
            role=Role.COMPANY_ADMIN,
        )
        await users.add(person)
        return person
    if person.company_id is None:
        raise InvalidValue("Este e-mail é de um administrador da plataforma.")
    person.password_hash = password_hash
    person.is_active = True
    await users.save(person)
    return person


async def _clear(db: AsyncSession, person: User) -> None:
    owner = person.id
    await db.execute(delete(AnalysisModelRow).where(AnalysisModelRow.owner_user_id == owner))
    await db.execute(delete(MessageModel).where(MessageModel.owner_user_id == owner))
    await db.execute(delete(ConversationModel).where(ConversationModel.owner_user_id == owner))
    await db.execute(
        delete(ChannelConnectionModel).where(
            ChannelConnectionModel.owner_user_id == owner,
            or_(
                ChannelConnectionModel.external_account.in_([WHATSAPP_ACCOUNT, SLACK_ACCOUNT]),
                ChannelConnectionModel.session_ref.startswith(DEMO_INSTANCE_PREFIX),
            ),
        )
    )
    await db.execute(
        delete(AnalysisPromptModel).where(
            AnalysisPromptModel.owner_user_id == owner,
            AnalysisPromptModel.title.in_([title for title, _ in PROMPTS]),
        )
    )


def _connection(person: User, channel: str, account: str, now: datetime) -> ChannelConnectionModel:
    assert person.company_id is not None
    return ChannelConnectionModel(
        id=uuid4(),
        company_id=person.company_id,
        owner_user_id=person.id,
        channel=channel,
        external_account=account,
        status=NumberStatus.CONNECTED.value,
        status_changed_at=now - timedelta(days=7),
        session_ref=DEMO_INSTANCE if channel == WHATSAPP else None,
        last_confirmed_at=now,
        message_events_enabled=True,
    )


def _thread(
    db: AsyncSession, person: User, connection_id: UUID, thread: Thread, now: datetime
) -> UUID:
    assert person.company_id is not None
    conversation = ConversationModel(
        id=uuid4(),
        company_id=person.company_id,
        owner_user_id=person.id,
        connection_id=connection_id,
        channel=thread.channel,
        external_ref=thread.external_ref,
        kind=thread.kind.value,
        name=thread.name,
        last_message_at=now - min(line.ago for line in thread.lines),
    )
    db.add(conversation)
    for index, line in enumerate(thread.lines):
        db.add(
            MessageModel(
                id=uuid4(),
                company_id=person.company_id,
                owner_user_id=person.id,
                connection_id=connection_id,
                conversation_id=conversation.id,
                external_id=f"demo-{thread.key}-{index:02d}",
                from_me=line.author is None,
                sender_ref=thread.people.get(line.author) if line.author else None,
                sender_name=line.author or PERSON_NAME,
                type="text",
                text=line.text,
                sent_at=now - line.ago,
            )
        )
    return conversation.id


async def _analysis(
    db: AsyncSession, person: User, conversation_id: UUID, script: Script, now: datetime
) -> None:
    assert person.company_id is not None
    analyst = preset_by_id(DEFAULT_PRESET)
    extractor = preset_by_id(EXTRACTOR_PRESET)
    assert analyst is not None and extractor is not None
    messages = SqlMessageRepository(db)
    analyses = SqlAnalysisRepository(db)
    selected = await messages.list_messages(conversation_id, since=None, until=None, limit=500)
    # Termina alguns minutos antes de agora, como se tivesse acabado de rodar.
    clock = DemoClock(now - timedelta(minutes=12))
    analysis = Analysis(
        id=uuid4(),
        company_id=person.company_id,
        owner_user_id=person.id,
        conversation_id=conversation_id,
        prompt_text=script.prompt,
        model=analyst.model,
        status=AnalysisStatus.RUNNING,
        result=None,
        message_count=len(selected),
        created_at=clock(),
        steps=initial_steps(analyst.model, extractor.model),
    )
    await analyses.add(analysis)
    job = AgentJob(
        analysis_id=analysis.id,
        conversation_id=conversation_id,
        message_ids=[m.id for m in selected],
        prompt=script.prompt,
        model=analyst.model,
        extractor_model=extractor.model,
        settings=None,
    )
    pipeline = AgentPipeline(messages, analyses, ScriptedModel(script, clock), clock, db.flush)
    await pipeline.execute(job)
    if script.publish_to:
        actor = Actor(person.id, uuid4(), person.role, person.company_id)
        publishing = PublishingService(analyses, MockOutputGateway(), clock)
        await publishing.publish(
            actor, analysis.id, PublishDecision(approve=True, destinations=script.publish_to)
        )


async def seed_demo(
    database_url: str, hasher: PasswordHasher, email: str, password: str
) -> SeedResult:
    validate_password(password)
    now = datetime.now(UTC)
    engine = create_engine(database_url)
    try:
        async with session_scope(create_session_factory(engine)) as db:
            person = await _person(db, hasher, email, password)
            await _clear(db, person)
            connections = {
                WHATSAPP: _connection(person, WHATSAPP, WHATSAPP_ACCOUNT, now),
                SLACK: _connection(person, SLACK, SLACK_ACCOUNT, now),
            }
            db.add_all(connections.values())
            await db.flush()
            conversations = {
                thread.key: _thread(db, person, connections[thread.channel].id, thread, now)
                for thread in THREADS
            }
            assert person.company_id is not None
            prompts = SqlPromptRepository(db)
            for title, body in PROMPTS:
                await prompts.add(
                    AnalysisPrompt.create(
                        company_id=person.company_id,
                        owner_user_id=person.id,
                        title=title,
                        body=body,
                    )
                )
            await db.flush()
            for script in SCRIPTS:
                await _analysis(db, person, conversations[script.thread], script, now)
    finally:
        await engine.dispose()
    return SeedResult(
        email=normalize_email(email),
        conversations=len(THREADS),
        messages=sum(len(thread.lines) for thread in THREADS),
        analyses=len(SCRIPTS),
    )
