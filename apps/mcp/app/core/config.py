"""Configuração lida exclusivamente do ambiente."""

from typing import Literal

from pydantic import ValidationError
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


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    mcp_allowed_hosts: str = "localhost:*,127.0.0.1:*,mcp:*"


def load_settings() -> Settings:
    """Carrega settings e converte erros de validação em mensagem com o nome das variáveis."""
    try:
        return Settings()
    except ValidationError as error:
        missing: list[str] = []
        invalid: list[str] = []
        for item in error.errors():
            name = str(item["loc"][0]).upper()
            (missing if item["type"] == "missing" else invalid).append(name)
        raise MissingConfigurationError(missing, invalid) from None
