from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

CompanyRoleName = Literal["company_admin", "user"]
RoleName = Literal["platform_admin", "company_admin", "user"]


class CompanyRef(BaseModel):
    id: UUID
    name: str


class Me(BaseModel):
    id: UUID
    name: str
    email: str
    role: RoleName
    company: CompanyRef | None


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=1024)


class SessionOut(BaseModel):
    token: str
    expires_at: datetime
    user: Me


class PasswordRecoveryIn(BaseModel):
    email: EmailStr


class PasswordResetIn(BaseModel):
    token: str = Field(min_length=1)
    password: str = Field(max_length=1024)


class UpdateMeIn(BaseModel):
    name: str


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=1024)
    new_password: str = Field(max_length=1024)


class CompanyIn(BaseModel):
    name: str
    admin_email: EmailStr


class CompanyUpdateIn(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class CompanyOut(BaseModel):
    id: UUID
    name: str
    is_active: bool


class CompanyCreatedOut(CompanyOut):
    invitation_email_failed: bool


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: RoleName
    is_active: bool


class UserUpdateIn(BaseModel):
    role: CompanyRoleName | None = None
    is_active: bool | None = None


class InvitationIn(BaseModel):
    email: EmailStr
    role: CompanyRoleName


class InvitationOut(BaseModel):
    id: UUID
    email: str
    role: RoleName
    expires_at: datetime
    email_failed: bool


class InvitationTokenIn(BaseModel):
    token: str = Field(min_length=1)


class InvitationPreviewOut(BaseModel):
    email: str
    company_name: str


class InvitationAcceptIn(BaseModel):
    token: str = Field(min_length=1)
    name: str
    password: str = Field(max_length=1024)
