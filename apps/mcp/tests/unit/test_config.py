import pytest

from app.core.config import load_settings

pytestmark = pytest.mark.unit


def test_hosts_padrao_incluem_o_nome_do_servico() -> None:
    assert "mcp:*" in load_settings().mcp_allowed_hosts
