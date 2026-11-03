import pytest

from app.core.config import MissingConfigurationError, load_settings

pytestmark = pytest.mark.unit


def test_usa_intervalos_padrao(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")
    monkeypatch.setenv("BACKEND_URL", "http://backend:8000")
    monkeypatch.setenv("INTERNAL_API_TOKEN", "token")

    settings = load_settings()

    assert settings.worker_heartbeat_interval_seconds == 5
    assert settings.worker_heartbeat_ttl_seconds == 20


def test_falha_citando_a_variavel_ausente(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("REDIS_URL", "BACKEND_URL", "INTERNAL_API_TOKEN"):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(MissingConfigurationError) as exc:
        load_settings()

    assert exc.value.missing == ["REDIS_URL", "BACKEND_URL", "INTERNAL_API_TOKEN"]
