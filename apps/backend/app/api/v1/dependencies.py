"""Injeção de dependências da API. Liga ports às implementações por requisição."""

import hmac
from collections.abc import AsyncIterator
from datetime import timedelta
from typing import Annotated

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import Container
from app.core.database import session_scope
from app.domain.actor import Actor
from app.domain.errors import Forbidden, NotAuthenticated
from app.domain.user import Role
from app.repositories.analyses import (
    SqlAnalysisRepository,
    SqlPromptRepository,
    SqlSettingsRepository,
)
from app.repositories.api_tokens import SqlApiTokenRepository
from app.repositories.identity import (
    SqlCompanyRepository,
    SqlInvitationRepository,
    SqlPasswordResetRepository,
    SqlSessionRepository,
    SqlUserRepository,
)
from app.repositories.messages import SqlMessageRepository
from app.repositories.numbers import SqlAttemptRepository, SqlNumberRepository
from app.services.account import AccountService, PasswordRecoveryService
from app.services.analyses import AnalysisService, PromptService, SettingsService
from app.services.api_tokens import ApiTokenService
from app.services.auth import AuthService
from app.services.companies import CompanyService
from app.services.invitations import InvitationService
from app.services.messages import MessageService
from app.services.number_sync import NumberSyncService
from app.services.numbers import NumberService
from app.services.platform_status import PlatformStatusService
from app.services.users import UserAdminService

bearer = HTTPBearer(auto_error=False)


def get_container(request: Request) -> Container:
    container: Container = request.app.state.container
    return container


ContainerDep = Annotated[Container, Depends(get_container)]


async def get_db(container: ContainerDep) -> AsyncIterator[AsyncSession]:
    async with session_scope(container.session_factory) as session:
        yield session


# scope="function": o commit acontece antes de a resposta ser enviada.
DbSession = Annotated[AsyncSession, Depends(get_db, scope="function")]


def get_auth_service(container: ContainerDep, db: DbSession) -> AuthService:
    return AuthService(
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        sessions=SqlSessionRepository(db),
        hasher=container.hasher,
        tokens=container.tokens,
        throttle=container.throttle,
        clock=container.clock,
        session_ttl=timedelta(hours=container.settings.session_ttl_hours),
        dummy_hash=container.dummy_hash,
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def get_invitation_service(container: ContainerDep, db: DbSession) -> InvitationService:
    return InvitationService(
        invitations=SqlInvitationRepository(db),
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        hasher=container.hasher,
        tokens=container.tokens,
        email=container.email,
        clock=container.clock,
        ttl=timedelta(days=container.settings.invitation_ttl_days),
        public_url=container.settings.public_app_url,
    )


InvitationServiceDep = Annotated[InvitationService, Depends(get_invitation_service)]


def get_company_service(
    container: ContainerDep, db: DbSession, invitations: InvitationServiceDep
) -> CompanyService:
    return CompanyService(
        companies=SqlCompanyRepository(db),
        sessions=SqlSessionRepository(db),
        invitations=invitations,
        clock=container.clock,
        numbers=SqlNumberRepository(db),
        attempts=SqlAttemptRepository(db),
    )


CompanyServiceDep = Annotated[CompanyService, Depends(get_company_service)]


def get_user_admin_service(container: ContainerDep, db: DbSession) -> UserAdminService:
    return UserAdminService(
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        sessions=SqlSessionRepository(db),
        clock=container.clock,
        numbers=SqlNumberRepository(db),
        attempts=SqlAttemptRepository(db),
    )


UserAdminServiceDep = Annotated[UserAdminService, Depends(get_user_admin_service)]


def get_account_service(container: ContainerDep, db: DbSession) -> AccountService:
    return AccountService(
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        sessions=SqlSessionRepository(db),
        hasher=container.hasher,
        clock=container.clock,
    )


AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]


def get_recovery_service(container: ContainerDep, db: DbSession) -> PasswordRecoveryService:
    return PasswordRecoveryService(
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        resets=SqlPasswordResetRepository(db),
        sessions=SqlSessionRepository(db),
        hasher=container.hasher,
        tokens=container.tokens,
        clock=container.clock,
        ttl=timedelta(minutes=container.settings.password_reset_ttl_minutes),
        public_url=container.settings.public_app_url,
    )


RecoveryServiceDep = Annotated[PasswordRecoveryService, Depends(get_recovery_service)]


def get_status_service(container: ContainerDep) -> PlatformStatusService:
    return container.status_service


StatusServiceDep = Annotated[PlatformStatusService, Depends(get_status_service)]


def get_number_sync_service(container: ContainerDep, db: DbSession) -> NumberSyncService:
    return NumberSyncService(
        numbers=SqlNumberRepository(db),
        attempts=SqlAttemptRepository(db),
        users=SqlUserRepository(db),
        gateway=container.whatsapp,
        clock=container.clock,
    )


NumberSyncServiceDep = Annotated[NumberSyncService, Depends(get_number_sync_service)]


def get_number_service(
    container: ContainerDep, db: DbSession, sync: NumberSyncServiceDep
) -> NumberService:
    return NumberService(
        numbers=SqlNumberRepository(db),
        attempts=SqlAttemptRepository(db),
        users=SqlUserRepository(db),
        gateway=container.whatsapp,
        sync=sync,
        clock=container.clock,
        attempt_ttl=timedelta(minutes=container.settings.connection_attempt_ttl_minutes),
    )


NumberServiceDep = Annotated[NumberService, Depends(get_number_service)]


def get_message_service(container: ContainerDep, db: DbSession) -> MessageService:
    return MessageService(
        messages=SqlMessageRepository(db),
        numbers=SqlNumberRepository(db),
        gateway=container.whatsapp,
        clock=container.clock,
        retention_days=container.settings.message_retention_days,
    )


MessageServiceDep = Annotated[MessageService, Depends(get_message_service)]


def get_analysis_service(container: ContainerDep, db: DbSession) -> AnalysisService:
    return AnalysisService(
        messages=SqlMessageRepository(db),
        analyses=SqlAnalysisRepository(db),
        prompts=SqlPromptRepository(db),
        settings=SqlSettingsRepository(db),
        model=container.analysis_model,
        clock=container.clock,
        default_model=container.settings.openrouter_default_model or None,
    )


AnalysisServiceDep = Annotated[AnalysisService, Depends(get_analysis_service)]


def get_prompt_service(db: DbSession) -> PromptService:
    return PromptService(SqlPromptRepository(db))


PromptServiceDep = Annotated[PromptService, Depends(get_prompt_service)]


def get_settings_service(container: ContainerDep, db: DbSession) -> SettingsService:
    return SettingsService(
        settings=SqlSettingsRepository(db),
        users=SqlUserRepository(db),
        default_retention_days=container.settings.message_retention_days,
    )


SettingsServiceDep = Annotated[SettingsService, Depends(get_settings_service)]


def get_api_token_service(container: ContainerDep, db: DbSession) -> ApiTokenService:
    return ApiTokenService(
        tokens=SqlApiTokenRepository(db),
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        generator=container.tokens,
        clock=container.clock,
    )


ApiTokenServiceDep = Annotated[ApiTokenService, Depends(get_api_token_service)]


def get_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> str:
    if credentials is None:
        raise NotAuthenticated()
    return credentials.credentials


TokenDep = Annotated[str, Depends(get_token)]


async def get_actor(token: TokenDep, auth: AuthServiceDep) -> Actor:
    return await auth.authenticate(token)


ActorDep = Annotated[Actor, Depends(get_actor)]


def require_platform_admin(actor: ActorDep) -> Actor:
    if actor.role is not Role.PLATFORM_ADMIN:
        raise Forbidden()
    return actor


def require_company_admin(actor: ActorDep) -> Actor:
    if actor.role is not Role.COMPANY_ADMIN:
        raise Forbidden()
    return actor


def require_company_member(actor: ActorDep) -> Actor:
    """Administrador da plataforma não tem números (FR-017)."""
    if actor.role is Role.PLATFORM_ADMIN:
        raise Forbidden()
    return actor


def require_evolution_webhook(
    container: ContainerDep,
    secret: Annotated[str, Header(alias="x-atentio-secret")] = "",
) -> None:
    expected = container.settings.evolution_webhook_secret.get_secret_value()
    if not hmac.compare_digest(secret.encode(), expected.encode()):
        raise NotAuthenticated()


def require_internal_token(
    container: ContainerDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    expected = container.settings.internal_api_token.get_secret_value()
    token = credentials.credentials if credentials else ""
    if not hmac.compare_digest(token.encode(), expected.encode()):
        raise NotAuthenticated()


async def get_mcp_actor(token: TokenDep, service: ApiTokenServiceDep) -> Actor:
    """Só o token do MCP abre estas rotas; sessão de navegador não vale aqui, e vice-versa."""
    return await service.authenticate(token)


McpActorDep = Annotated[Actor, Depends(get_mcp_actor)]
PlatformAdminDep = Annotated[Actor, Depends(require_platform_admin)]
CompanyAdminDep = Annotated[Actor, Depends(require_company_admin)]
CompanyMemberDep = Annotated[Actor, Depends(require_company_member)]
EvolutionWebhookDep = Annotated[None, Depends(require_evolution_webhook)]
InternalTokenDep = Annotated[None, Depends(require_internal_token)]
