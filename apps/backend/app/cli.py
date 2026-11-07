"""Comandos de operação.

Uso: python -m app.cli create-platform-admin --email X --name Y
     python -m app.cli seed-demo [--email X --password Y]
"""

import argparse
import asyncio
import getpass
import os
import sys

from app.core.config import DatabaseSettings, load_settings
from app.core.database import create_engine, create_session_factory, session_scope
from app.demo.seed import seed_demo
from app.domain.errors import DomainError, EmailInUse
from app.domain.ports import PasswordHasher
from app.domain.user import Role, User, normalize_email, validate_password
from app.infrastructure.security import Argon2PasswordHasher
from app.repositories.identity import SqlUserRepository

# Acesso de demonstração, público de propósito: só vale para os dados fictícios do seed.
DEMO_EMAIL = "pitch@akcit.com.br"
DEMO_PASSWORD = "akcit12345678"  # gitleaks:allow


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


def _seed_demo(email: str, password: str) -> int:
    settings = load_settings(DatabaseSettings)
    try:
        result = asyncio.run(
            seed_demo(settings.database_url, Argon2PasswordHasher(), email, password)
        )
    except DomainError as error:
        print(f"Erro: {error.message}", file=sys.stderr)
        return 1
    print(
        f"Demonstração pronta para {result.email}: {result.conversations} conversas, "
        f"{result.messages} mensagens e {result.analyses} análises."
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-platform-admin")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    demo = commands.add_parser("seed-demo", help="Dados fictícios para o pitch e testes locais")
    demo.add_argument("--email", default=os.environ.get("DEMO_EMAIL") or DEMO_EMAIL)
    demo.add_argument("--password", default=os.environ.get("DEMO_PASSWORD") or DEMO_PASSWORD)
    args = parser.parse_args(argv)

    if args.command == "seed-demo":
        return _seed_demo(args.email, args.password)

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
