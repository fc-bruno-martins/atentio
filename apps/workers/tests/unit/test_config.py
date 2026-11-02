import pytest

from app.core.config import MissingConfigurationError, load_settings

pytestmark = pytest.mark.unit


def test_usa_intervalos_padrao(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")

    settings = load_settings()

    assert settings.worker_heartbeat_interval_seconds == 5
    assert settings.worker_heartbeat_ttl_seconds == 20


def test_falha_citando_a_variavel_ausente(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("REDIS_URL", raising=False)

    with pytest.raises(MissingConfigurationError) as exc:
        load_settings()

    assert exc.value.missing == ["REDIS_URL"]
