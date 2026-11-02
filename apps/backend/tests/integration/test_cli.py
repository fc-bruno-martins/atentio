import getpass

import pytest

from app import cli
from app.container import Container
from tests.conftest import PASSWORD, Api

pytestmark = pytest.mark.integration


def _run(monkeypatch: pytest.MonkeyPatch, url: str, password: str, email: str) -> int:
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setattr(getpass, "getpass", lambda _: password)
    return cli.main(["create-platform-admin", "--email", email, "--name", "Root"])


async def test_cria_administrador_e_recusa_duplicado_e_senha_curta(
    api: Api,
    container: Container,
    postgres_url: str,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    import asyncio

    run = asyncio.to_thread

    assert await run(_run, monkeypatch, postgres_url, PASSWORD, "cli@judite.com") == 0
    assert (await api.login("cli@judite.com")).headers

    assert await run(_run, monkeypatch, postgres_url, PASSWORD, "cli@judite.com") == 1
    assert "já está em uso" in capsys.readouterr().err

    assert await run(_run, monkeypatch, postgres_url, "curta", "outro@judite.com") == 1
    assert "12 caracteres" in capsys.readouterr().err
