import json
from typing import Any

import httpx
import pytest

from app.domain.analysis import CompletionRequest
from app.domain.errors import AnalysisModelFailed, AnalysisNotConfigured
from app.infrastructure.openrouter import OpenRouterModel

pytestmark = pytest.mark.unit
REQUEST = CompletionRequest(model="m", system="s", user="u", temperature=0.2)


def _model(handler: Any, key: str | None = "chave") -> OpenRouterModel:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return OpenRouterModel(client, "http://openrouter/chat", key)


async def test_envia_modelo_mensagens_e_chave() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    assert await _model(handler).complete(REQUEST) == "ok"
    body = json.loads(seen[0].content)
    assert body["model"] == "m"
    assert body["temperature"] == 0.2
    assert [m["role"] for m in body["messages"]] == ["system", "user"]
    assert seen[0].headers["authorization"] == "Bearer chave"


async def test_sem_chave_nada_e_enviado() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise AssertionError("não deveria chamar o provedor")

    with pytest.raises(AnalysisNotConfigured):
        await _model(handler, key=None).complete(REQUEST)


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(500, json={}),
        httpx.Response(200, json={}),
        httpx.Response(200, json={"choices": []}),
        httpx.Response(200, json={"choices": [{"message": {"content": ""}}]}),
        httpx.Response(200, text="nao e json"),
    ],
)
async def test_respostas_ruins_viram_falha(response: httpx.Response) -> None:
    with pytest.raises(AnalysisModelFailed):
        await _model(lambda _: response).complete(REQUEST)


async def test_falha_de_rede_vira_falha() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sem rede")

    with pytest.raises(AnalysisModelFailed):
        await _model(handler).complete(REQUEST)


def _catalog() -> dict[str, Any]:
    text = {"output_modalities": ["text"]}
    return {
        "data": [
            {
                "id": "b/texto",
                "name": "B Texto",
                "architecture": text,
                "pricing": {"prompt": "0.000001", "completion": "0.000002"},
            },
            {
                "id": "a/gratis",
                "name": "A Gratis",
                "architecture": text,
                "pricing": {"prompt": "0"},
            },
            {
                "id": "c/imagem",
                "name": "Imagem",
                "architecture": {"output_modalities": ["image"]},
            },
            {"id": "d/auto", "name": "Auto", "architecture": text, "pricing": {"prompt": "-1"}},
        ]
    }


def _listing(handler: Any, clock: Any = lambda: 0.0) -> OpenRouterModel:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return OpenRouterModel(client, "http://or/chat", None, "http://or/models", 600, clock)


async def test_lista_so_quem_gera_texto_em_ordem_e_com_preco_por_milhao() -> None:
    models = await _listing(lambda _: httpx.Response(200, json=_catalog())).list_models()
    assert [m.id for m in models] == ["a/gratis", "d/auto", "b/texto"]
    assert models[2].input_price == 1.0
    assert models[2].output_price == 2.0
    assert models[0].input_price == 0
    assert models[1].input_price is None


async def test_lista_nao_exige_chave() -> None:
    models = await _listing(lambda _: httpx.Response(200, json=_catalog())).list_models()
    assert models


async def test_lista_fica_em_cache_ate_o_prazo() -> None:
    calls: list[int] = []
    now = [0.0]

    def handler(_: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(200, json=_catalog())

    model = _listing(handler, lambda: now[0])
    await model.list_models()
    await model.list_models()
    assert len(calls) == 1
    now[0] = 601
    await model.list_models()
    assert len(calls) == 2


async def test_falha_mantem_a_ultima_lista() -> None:
    now = [0.0]
    responses = [httpx.Response(200, json=_catalog()), httpx.Response(500)]
    model = _listing(lambda _: responses.pop(0), lambda: now[0])
    first = await model.list_models()
    now[0] = 601
    assert await model.list_models() == first


async def test_falha_sem_lista_vira_erro() -> None:
    with pytest.raises(AnalysisModelFailed):
        await _listing(lambda _: httpx.Response(500)).list_models()
