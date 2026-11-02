from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID, uuid4

from app.domain.company import validate_name
from app.domain.errors import InvalidValue

MIN_PASSWORD_LENGTH = 12


class Role(StrEnum):
    PLATFORM_ADMIN = "platform_admin"
    COMPANY_ADMIN = "company_admin"
    USER = "user"


COMPANY_ROLES = (Role.COMPANY_ADMIN, Role.USER)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise InvalidValue(f"A senha deve ter ao menos {MIN_PASSWORD_LENGTH} caracteres.")


@dataclass
class User:
    id: UUID
    company_id: UUID | None
    email: str
    name: str
    password_hash: str
    role: Role
    is_active: bool = True

    def __post_init__(self) -> None:
        if (self.role is Role.PLATFORM_ADMIN) != (self.company_id is None):
            raise InvalidValue("Só o administrador da plataforma existe sem empresa.")

    @classmethod
    def create(
        cls, *, company_id: UUID | None, email: str, name: str, password_hash: str, role: Role
    ) -> "User":
        return cls(
            id=uuid4(),
            company_id=company_id,
            email=normalize_email(email),
            name=validate_name(name),
            password_hash=password_hash,
            role=role,
        )

    @property
    def is_active_admin(self) -> bool:
        return self.is_active and self.role is Role.COMPANY_ADMIN

    def rename(self, name: str) -> None:
        self.name = validate_name(name)

    def change_role(self, role: Role) -> None:
        if role not in COMPANY_ROLES:
            raise InvalidValue("Perfil inválido para um usuário de empresa.")
        self.role = role
