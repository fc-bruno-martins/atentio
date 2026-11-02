"""Injeção de dependências da API. Liga ports às implementações por requisição."""

from collections.abc import AsyncIterator
from datetime import timedelta
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import Container
from app.core.database import session_scope
from app.domain.actor import Actor
from app.domain.errors import Forbidden, NotAuthenticated
from app.domain.user import Role
from app.repositories.identity import (
    SqlCompanyRepository,
    SqlInvitationRepository,
    SqlPasswordResetRepository,
    SqlSessionRepository,
    SqlUserRepository,
)
from app.services.account import AccountService, PasswordRecoveryService
from app.services.auth import AuthService
from app.services.companies import CompanyService
from app.services.invitations import InvitationService
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
    )


CompanyServiceDep = Annotated[CompanyService, Depends(get_company_service)]


def get_user_admin_service(container: ContainerDep, db: DbSession) -> UserAdminService:
    return UserAdminService(
        users=SqlUserRepository(db),
        companies=SqlCompanyRepository(db),
        sessions=SqlSessionRepository(db),
        clock=container.clock,
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


PlatformAdminDep = Annotated[Actor, Depends(require_platform_admin)]
CompanyAdminDep = Annotated[Actor, Depends(require_company_admin)]
