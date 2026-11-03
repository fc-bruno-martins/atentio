import pytest

from app.core.config import MissingConfigurationError, load_settings

pytestmark = pytest.mark.unit


def test_hosts_padrao_incluem_o_nome_do_servico(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_URL", "http://backend:8000")

    assert "mcp:*" in load_settings().mcp_allowed_hosts


def test_exige_o_endereco_do_backend(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BACKEND_URL", raising=False)

    with pytest.raises(MissingConfigurationError) as exc:
        load_settings()

    assert exc.value.missing == ["BACKEND_URL"]
