"""Implementa o port de tokens. Models do ORM não saem deste módulo."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.api_token import ApiToken
from app.models import ApiTokenModel


def _token(m: ApiTokenModel) -> ApiToken:
    return ApiToken(
        id=m.id,
        company_id=m.company_id,
        user_id=m.user_id,
        name=m.name,
        token_hash=m.token_hash,
        created_at=m.created_at,
        last_used_at=m.last_used_at,
        revoked_at=m.revoked_at,
    )


class SqlApiTokenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(self, token: ApiToken) -> None:
        self._db.add(
            ApiTokenModel(
                id=token.id,
                company_id=token.company_id,
                user_id=token.user_id,
                name=token.name,
                token_hash=token.token_hash,
                created_at=token.created_at,
            )
        )
        await self._db.flush()

    async def list_active(self, user_id: UUID) -> Sequence[ApiToken]:
        rows = await self._db.scalars(
            select(ApiTokenModel)
            .where(ApiTokenModel.user_id == user_id, ApiTokenModel.revoked_at.is_(None))
            .order_by(ApiTokenModel.created_at.desc())
        )
        return [_token(m) for m in rows]

    async def get_for_user(self, user_id: UUID, token_id: UUID) -> ApiToken | None:
        model = await self._db.scalar(
            select(ApiTokenModel).where(
                ApiTokenModel.user_id == user_id, ApiTokenModel.id == token_id
            )
        )
        return _token(model) if model else None

    async def get_by_hash(self, token_hash: str) -> ApiToken | None:
        model = await self._db.scalar(
            select(ApiTokenModel).where(ApiTokenModel.token_hash == token_hash)
        )
        return _token(model) if model else None

    async def save(self, token: ApiToken) -> None:
        model = await self._db.get_one(ApiTokenModel, token.id)
        model.last_used_at = token.last_used_at
        model.revoked_at = token.revoked_at
        await self._db.flush()
