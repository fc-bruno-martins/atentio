"""Tokens pessoais do MCP: criar, listar, revogar e autenticar."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.actor import Actor
from app.domain.api_token import ApiToken
from app.domain.errors import NotAuthenticated, NotFound
from app.domain.ports import (
    ApiTokenRepository,
    CompanyRepository,
    TokenGenerator,
    UserRepository,
)


@dataclass(frozen=True)
class CreatedToken:
    """O valor só existe nesta resposta: depois, resta apenas o hash."""

    token: ApiToken
    plain: str


class ApiTokenService:
    def __init__(
        self,
        tokens: ApiTokenRepository,
        users: UserRepository,
        companies: CompanyRepository,
        generator: TokenGenerator,
        clock: Callable[[], datetime],
    ) -> None:
        self._tokens = tokens
        self._users = users
        self._companies = companies
        self._generator = generator
        self._clock = clock

    async def list_tokens(self, actor: Actor) -> Sequence[ApiToken]:
        return await self._tokens.list_active(actor.user_id)

    async def create(self, actor: Actor, name: str) -> CreatedToken:
        plain, token_hash = self._generator.generate()
        token = ApiToken.create(
            company_id=actor.require_company(),
            user_id=actor.user_id,
            name=name,
            token_hash=token_hash,
            now=self._clock(),
        )
        await self._tokens.add(token)
        return CreatedToken(token, plain)

    async def revoke(self, actor: Actor, token_id: UUID) -> None:
        token = await self._tokens.get_for_user(actor.user_id, token_id)
        if token is None:
            raise NotFound()
        if token.is_active:
            token.revoked_at = self._clock()
            await self._tokens.save(token)

    async def authenticate(self, plain: str) -> Actor:
        token = await self._tokens.get_by_hash(self._generator.hash(plain))
        if token is None or not token.is_active:
            raise NotAuthenticated()
        user = await self._users.get(token.user_id)
        company = await self._companies.get(token.company_id)
        if user is None or company is None or not (user.is_active and company.is_active):
            raise NotAuthenticated()
        token.last_used_at = self._clock()
        await self._tokens.save(token)
        return Actor(user.id, token.id, user.role, user.company_id)
