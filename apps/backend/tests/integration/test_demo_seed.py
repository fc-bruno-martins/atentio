import pytest

from app.container import Container
from app.demo.seed import seed_demo
from tests.conftest import Api

pytestmark = pytest.mark.integration
EMAIL = "pitch@akcit.com.br"
PASSWORD = "akcit12345678"
RECONCILE = "/api/v1/internal/numbers/reconcile"


async def test_seed_pode_rodar_de_novo_e_deixa_a_demonstracao_pronta(
    api: Api, container: Container, postgres_url: str
) -> None:
    await seed_demo(postgres_url, container.hasher, EMAIL, PASSWORD)
    result = await seed_demo(postgres_url, container.hasher, EMAIL, PASSWORD)
    person = await api.login(EMAIL, PASSWORD)

    conversations = (await api.client.get("/api/v1/conversations", headers=person.headers)).json()
    assert len(conversations) == result.conversations
    assert {c["channel"] for c in conversations} == {"whatsapp", "slack"}

    analyses = (await api.client.get("/api/v1/analyses", headers=person.headers)).json()
    assert len(analyses) == result.analyses
    assert {a["status"] for a in analyses} == {"done"}
    publishers = {
        a["prompt_text"]: next(s for s in a["steps"] if s["agent"] == "publicador")
        for a in analyses
    }
    assert sorted(s["status"] for s in publishers.values()) == ["done", "waiting"]

    # A reconciliação não derruba a conexão fictícia nem apaga as mensagens recentes.
    summary = await api.client.post(RECONCILE, headers={"Authorization": "Bearer token-interno"})
    assert summary.json()["disconnected"] == 0
    assert summary.json()["purged"] == 0
    connections = (await api.client.get("/api/v1/connections", headers=person.headers)).json()
    assert [(c["channel"], c["status"]) for c in connections] == [("whatsapp", "connected")]
