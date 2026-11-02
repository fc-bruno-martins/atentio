"""Comandos de operação. Uso: python -m app.cli create-platform-admin --email X --name Y"""

import argparse
import asyncio
import getpass
import sys

from app.core.config import DatabaseSettings, load_settings
from app.core.database import create_engine, create_session_factory, session_scope
from app.domain.errors import DomainError, EmailInUse
from app.domain.ports import PasswordHasher
from app.domain.user import Role, User, normalize_email, validate_password
from app.infrastructure.security import Argon2PasswordHasher
from app.repositories.identity import SqlUserRepository


async def create_platform_admin(
    database_url: str, hasher: PasswordHasher, email: str, name: str, password: str
) -> None:
    validate_password(password)
    engine = create_engine(database_url)
    try:
        async with session_scope(create_session_factory(engine)) as db:
            users = SqlUserRepository(db)
            if await users.get_by_email(normalize_email(email)) is not None:
                raise EmailInUse()
            await users.add(
                User.create(
                    company_id=None,
                    email=email,
                    name=name,
                    password_hash=await hasher.hash(password),
                    role=Role.PLATFORM_ADMIN,
                )
            )
    finally:
        await engine.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-platform-admin")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    args = parser.parse_args(argv)

    password = getpass.getpass("Senha (mínimo de 12 caracteres): ")
    settings = load_settings(DatabaseSettings)
    try:
        asyncio.run(
            create_platform_admin(
                settings.database_url, Argon2PasswordHasher(), args.email, args.name, password
            )
        )
    except DomainError as error:
        print(f"Erro: {error.message}", file=sys.stderr)
        return 1
    print(f"Administrador da plataforma criado: {args.email}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
