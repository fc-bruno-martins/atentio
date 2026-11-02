"""Implementam os ports de identidade. Models do ORM não saem deste módulo."""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.company import Company
from app.domain.errors import EmailInUse, InvitationAlreadyPending
from app.domain.invitation import Invitation, InvitationStatus
from app.domain.password_reset import PasswordReset
from app.domain.session import AuthSession
from app.domain.user import Role, User
from app.models import (
    CompanyModel,
    InvitationModel,
    PasswordResetModel,
    SessionModel,
    UserModel,
)


def _violates(error: IntegrityError, constraint: str) -> bool:
    """A corrida entre requisições concorrentes só aparece na restrição do banco."""
    return constraint in str(error.orig)


def _company(m: CompanyModel) -> Company:
    return Company(id=m.id, name=m.name, is_active=m.is_active)


def _user(m: UserModel) -> User:
    return User(
        id=m.id,
        company_id=m.company_id,
        email=m.email,
        name=m.name,
        password_hash=m.password_hash,
        role=Role(m.role),
        is_active=m.is_active,
    )


def _invitation(m: InvitationModel) -> Invitation:
    return Invitation(
        id=m.id,
        company_id=m.company_id,
        email=m.email,
        role=Role(m.role),
        token_hash=m.token_hash,
        expires_at=m.expires_at,
        invited_by=m.invited_by,
        status=InvitationStatus(m.status),
        last_send_failed_at=m.last_send_failed_at,
    )


def _session(m: SessionModel) -> AuthSession:
    return AuthSession(
        id=m.id,
        user_id=m.user_id,
        token_hash=m.token_hash,
        expires_at=m.expires_at,
        revoked_at=m.revoked_at,
    )


def _reset(m: PasswordResetModel) -> PasswordReset:
    return PasswordReset(
        id=m.id,
        user_id=m.user_id,
        token_hash=m.token_hash,
        expires_at=m.expires_at,
        used_at=m.used_at,
    )


class SqlCompanyRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, company: Company) -> None:
        self._db.add(CompanyModel(id=company.id, name=company.name, is_active=company.is_active))
        await self._db.flush()

    async def get(self, company_id: UUID) -> Company | None:
        model = await self._db.get(CompanyModel, company_id)
        return _company(model) if model else None

    async def get_for_update(self, company_id: UUID) -> Company | None:
        model = await self._db.scalar(
            select(CompanyModel)
            .where(CompanyModel.id == company_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return _company(model) if model else None

    async def list_all(self) -> Sequence[Company]:
        result = await self._db.scalars(select(CompanyModel).order_by(CompanyModel.name))
        return [_company(m) for m in result]

    async def save(self, company: Company) -> None:
        await self._db.execute(
            update(CompanyModel)
            .where(CompanyModel.id == company.id)
            .values(name=company.name, is_active=company.is_active)
        )


class SqlUserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, user: User) -> None:
        self._db.add(
            UserModel(
                id=user.id,
                company_id=user.company_id,
                email=user.email,
                name=user.name,
                password_hash=user.password_hash,
                role=user.role.value,
                is_active=user.is_active,
            )
        )
        try:
            await self._db.flush()
        except IntegrityError as error:
            if _violates(error, "uq_users_email"):
                raise EmailInUse() from error
            raise

    async def get(self, user_id: UUID) -> User | None:
        model = await self._db.get(UserModel, user_id, populate_existing=True)
        return _user(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        model = await self._db.scalar(select(UserModel).where(UserModel.email == email))
        return _user(model) if model else None

    async def get_in_company(self, company_id: UUID, user_id: UUID) -> User | None:
        model = await self._db.scalar(
            select(UserModel)
            .where(UserModel.id == user_id, UserModel.company_id == company_id)
            .execution_options(populate_existing=True)
        )
        return _user(model) if model else None

    async def list_by_company(self, company_id: UUID) -> Sequence[User]:
        result = await self._db.scalars(
            select(UserModel).where(UserModel.company_id == company_id).order_by(UserModel.name)
        )
        return [_user(m) for m in result]

    async def count_active_admins(self, company_id: UUID) -> int:
        count = await self._db.scalar(
            select(func.count())
            .select_from(UserModel)
            .where(
                UserModel.company_id == company_id,
                UserModel.role == Role.COMPANY_ADMIN.value,
                UserModel.is_active.is_(True),
            )
        )
        return count or 0

    async def save(self, user: User) -> None:
        await self._db.execute(
            update(UserModel)
            .where(UserModel.id == user.id)
            .values(
                name=user.name,
                password_hash=user.password_hash,
                role=user.role.value,
                is_active=user.is_active,
            )
        )


class SqlInvitationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, invitation: Invitation) -> None:
        self._db.add(
            InvitationModel(
                id=invitation.id,
                company_id=invitation.company_id,
                email=invitation.email,
                role=invitation.role.value,
                token_hash=invitation.token_hash,
                expires_at=invitation.expires_at,
                status=invitation.status.value,
                invited_by=invitation.invited_by,
                last_send_failed_at=invitation.last_send_failed_at,
            )
        )
        try:
            await self._db.flush()
        except IntegrityError as error:
            if _violates(error, "uq_invitations_pending_email"):
                raise InvitationAlreadyPending() from error
            raise

    async def _one(self, *conditions: object) -> Invitation | None:
        model = await self._db.scalar(
            select(InvitationModel)
            .where(*conditions)  # type: ignore[arg-type]
            .execution_options(populate_existing=True)
        )
        return _invitation(model) if model else None

    async def get_by_token_hash(self, token_hash: str) -> Invitation | None:
        return await self._one(InvitationModel.token_hash == token_hash)

    async def get_pending_by_email(self, email: str) -> Invitation | None:
        return await self._one(
            InvitationModel.email == email,
            InvitationModel.status == InvitationStatus.PENDING.value,
        )

    async def get_in_company(self, company_id: UUID, invitation_id: UUID) -> Invitation | None:
        return await self._one(
            InvitationModel.id == invitation_id, InvitationModel.company_id == company_id
        )

    async def list_pending_by_company(self, company_id: UUID) -> Sequence[Invitation]:
        result = await self._db.scalars(
            select(InvitationModel)
            .where(
                InvitationModel.company_id == company_id,
                InvitationModel.status == InvitationStatus.PENDING.value,
            )
            .order_by(InvitationModel.created_at.desc())
        )
        return [_invitation(m) for m in result]

    async def save(self, invitation: Invitation) -> None:
        await self._db.execute(
            update(InvitationModel)
            .where(InvitationModel.id == invitation.id)
            .values(
                token_hash=invitation.token_hash,
                expires_at=invitation.expires_at,
                status=invitation.status.value,
                last_send_failed_at=invitation.last_send_failed_at,
            )
        )


class SqlSessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, session: AuthSession) -> None:
        self._db.add(
            SessionModel(
                id=session.id,
                user_id=session.user_id,
                token_hash=session.token_hash,
                expires_at=session.expires_at,
            )
        )
        await self._db.flush()

    async def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        model = await self._db.scalar(
            select(SessionModel)
            .where(SessionModel.token_hash == token_hash)
            .execution_options(populate_existing=True)
        )
        return _session(model) if model else None

    async def save(self, session: AuthSession) -> None:
        await self._db.execute(
            update(SessionModel)
            .where(SessionModel.id == session.id)
            .values(expires_at=session.expires_at, revoked_at=session.revoked_at)
        )

    async def revoke_for_user(
        self, user_id: UUID, now: datetime, *, except_session: UUID | None = None
    ) -> None:
        statement = update(SessionModel).where(
            SessionModel.user_id == user_id, SessionModel.revoked_at.is_(None)
        )
        if except_session is not None:
            statement = statement.where(SessionModel.id != except_session)
        await self._db.execute(statement.values(revoked_at=now))

    async def revoke_for_company(self, company_id: UUID, now: datetime) -> None:
        users = select(UserModel.id).where(UserModel.company_id == company_id)
        await self._db.execute(
            update(SessionModel)
            .where(SessionModel.user_id.in_(users), SessionModel.revoked_at.is_(None))
            .values(revoked_at=now)
        )


class SqlPasswordResetRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, reset: PasswordReset) -> None:
        self._db.add(
            PasswordResetModel(
                id=reset.id,
                user_id=reset.user_id,
                token_hash=reset.token_hash,
                expires_at=reset.expires_at,
            )
        )
        await self._db.flush()

    async def get_by_token_hash(self, token_hash: str) -> PasswordReset | None:
        model = await self._db.scalar(
            select(PasswordResetModel)
            .where(PasswordResetModel.token_hash == token_hash)
            .execution_options(populate_existing=True)
        )
        return _reset(model) if model else None

    async def save(self, reset: PasswordReset) -> None:
        await self._db.execute(
            update(PasswordResetModel)
            .where(PasswordResetModel.id == reset.id)
            .values(used_at=reset.used_at)
        )

    async def invalidate_for_user(self, user_id: UUID, now: datetime) -> None:
        await self._db.execute(
            update(PasswordResetModel)
            .where(PasswordResetModel.user_id == user_id, PasswordResetModel.used_at.is_(None))
            .values(used_at=now)
        )
