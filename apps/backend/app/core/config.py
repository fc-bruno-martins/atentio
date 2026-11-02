"""Configuração lida exclusivamente do ambiente."""

from typing import Literal

from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class MissingConfigurationError(RuntimeError):
    """Variáveis de ambiente obrigatórias ausentes ou inválidas."""

    def __init__(self, missing: list[str], invalid: list[str]) -> None:
        self.missing = missing
        self.invalid = invalid
        parts = []
        if missing:
            parts.append(f"variáveis obrigatórias ausentes: {', '.join(missing)}")
        if invalid:
            parts.append(f"variáveis inválidas: {', '.join(invalid)}")
        super().__init__("Configuração incompleta — " + "; ".join(parts))


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    database_url: str


class Settings(DatabaseSettings):
    redis_url: str
    evolution_api_url: str
    evolution_api_key: SecretStr
    mcp_url: str
    public_app_url: str
    smtp_host: str
    smtp_from: str
    smtp_port: int = 1025
    smtp_user: str | None = None
    smtp_password: SecretStr | None = None
    smtp_tls: bool = False
    health_probe_timeout_seconds: float = Field(default=2.0, gt=0)
    session_ttl_hours: int = Field(default=12, gt=0)
    invitation_ttl_days: int = Field(default=7, gt=0)
    password_reset_ttl_minutes: int = Field(default=60, gt=0)
    login_max_failures: int = Field(default=5, gt=0)
    login_block_minutes: int = Field(default=15, gt=0)


def load_settings[S: DatabaseSettings](cls: type[S]) -> S:
    """Carrega settings e converte erros de validação em mensagem com o nome das variáveis."""
    try:
        return cls()
    except ValidationError as error:
        missing: list[str] = []
        invalid: list[str] = []
        for item in error.errors():
            name = str(item["loc"][0]).upper()
            (missing if item["type"] == "missing" else invalid).append(name)
        raise MissingConfigurationError(missing, invalid) from None
