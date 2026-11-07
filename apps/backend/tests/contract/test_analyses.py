"""Análises com banco real: fluxo, isolamento, configurações e expurgo por empresa."""

import time
from typing import Any
from uuid import uuid4

import pytest

from app.domain.errors import AnalysisNotConfigured
from tests.conftest import WEBHOOK_SECRET, Api, Person

pytestmark = pytest.mark.contract
BASE = "/api/v1/analyses"
PROMPTS = "/api/v1/analysis-prompts"
SETTINGS = "/api/v1/company-settings"
TOKEN = {"Authorization": "Bearer token-interno"}


async def _world(api: Api) -> tuple[Person, Person, Person, Person, str]:
    root = await api.platform_admin()
    _, admin = await api.company(root, "Acme", "admin@acme.com")
    user = await api.member(admin, "user@acme.com")
    other = await api.member(admin, "outra@acme.com")
    _, foreign = await api.company(root, "Beta", "admin@beta.com")
    attempt = (
        await api.client.post("/api/v1/channels/whatsapp/attempts", headers=user.headers)
    ).json()
    instance = next(iter(api.whatsapp.instances))
    api.whatsapp.scan(instance, "5511999999999@s.whatsapp.net")
    await api.client.get(
        f"/api/v1/channels/whatsapp/attempts/{attempt['id']}", headers=user.headers
    )
    await _message(api, instance, "A")
    [conversation] = (await api.client.get("/api/v1/conversations", headers=user.headers)).json()
    return admin, user, other, foreign, conversation["id"]


async def _message(api: Api, instance: str, external_id: str, age_days: float = 0) -> None:
    data: dict[str, Any] = {
        "key": {"remoteJid": "5511@s.whatsapp.net", "fromMe": False, "id": external_id},
        "pushName": "Ana",
        "message": {"conversation": "texto"},
        "messageType": "conversation",
        "messageTimestamp": int(time.time() - age_days * 86400),
    }
    await api.client.post(
        "/api/v1/internal/webhooks/evolution",
        json={"event": "messages.upsert", "instance": instance, "data": data},
        headers={"x-atentio-secret": WEBHOOK_SECRET},
    )


async def test_analisa_e_guarda_no_historico(api: Api) -> None:
    _, user, _, _, conversation = await _world(api)
    response = await api.client.post(
        BASE, json={"conversation_id": conversation, "prompt_text": "Resuma"}, headers=user.headers
    )
    assert response.status_code == 201
    assert response.json()["result"] == "resultado da analise"
    assert response.json()["model"] == "modelo/padrao"
    assert len((await api.client.get(BASE, headers=user.headers)).json()) == 1


async def test_outras_pessoas_nao_alcancam_a_analise(api: Api) -> None:
    admin, user, other, foreign, conversation = await _world(api)
    payload = {"conversation_id": conversation, "prompt_text": "Resuma"}
    await api.client.post(BASE, json=payload, headers=user.headers)
    for person in (admin, other, foreign):
        response = await api.client.post(BASE, json=payload, headers=person.headers)
        assert response.status_code == 404
        assert (await api.client.get(BASE, headers=person.headers)).json() == []


async def test_provedor_nao_configurado_responde_503(api: Api) -> None:
    _, user, _, _, conversation = await _world(api)
    api.model.error = AnalysisNotConfigured()
    response = await api.client.post(
        BASE, json={"conversation_id": conversation, "prompt_text": "Resuma"}, headers=user.headers
    )
    assert response.status_code == 503
    assert response.json()["code"] == "analysis_not_configured"


async def test_prompts_sao_da_pessoa(api: Api) -> None:
    _, user, other, _, _ = await _world(api)
    created = await api.client.post(
        PROMPTS, json={"title": "Pendências", "body": "Liste"}, headers=user.headers
    )
    assert created.status_code == 201
    assert (await api.client.get(PROMPTS, headers=other.headers)).json() == []
    url = f"{PROMPTS}/{created.json()['id']}"
    assert (await api.client.delete(url, headers=other.headers)).status_code == 404
    assert (await api.client.delete(url, headers=user.headers)).status_code == 204


async def test_admin_configura_a_retencao(api: Api) -> None:
    admin, _, _, _, _ = await _world(api)
    assert (await api.client.get(SETTINGS, headers=admin.headers)).json()["retention_days"] == 7
    response = await api.client.put(SETTINGS, json={"retention_days": 30}, headers=admin.headers)
    assert response.json() == {"retention_days": 30}
    invalid = await api.client.put(SETTINGS, json={"retention_days": 0}, headers=admin.headers)
    assert invalid.status_code == 422


async def test_expurgo_respeita_o_prazo_da_empresa(api: Api) -> None:
    admin, user, _, _, _ = await _world(api)
    instance = next(iter(api.whatsapp.instances))
    await api.client.put(SETTINGS, json={"retention_days": 30}, headers=admin.headers)
    await _message(api, instance, "OLD", age_days=8)
    response = await api.client.post("/api/v1/internal/numbers/reconcile", headers=TOKEN)
    assert response.json()["purged"] == 0

    await api.client.put(SETTINGS, json={"retention_days": 1}, headers=admin.headers)
    response = await api.client.post("/api/v1/internal/numbers/reconcile", headers=TOKEN)
    assert response.json()["purged"] == 1
    assert len((await api.client.get("/api/v1/conversations", headers=user.headers)).json()) == 1


async def test_admin_configura_ia_so_na_propria_empresa(api: Api) -> None:
    admin, user, _, foreign, conversation = await _world(api)
    url = f"/api/v1/users/{user.id}/ai-settings"
    body = {"model": "modelo/x", "temperature": 0.5, "extra_prompt": "Seja breve"}
    assert (await api.client.put(url, json=body, headers=admin.headers)).json() == body
    assert (await api.client.get(url, headers=foreign.headers)).status_code == 404
    assert (await api.client.put(url, json=body, headers=foreign.headers)).status_code == 404

    result = await api.client.post(
        BASE, json={"conversation_id": conversation, "prompt_text": "Resuma"}, headers=user.headers
    )
    assert result.json()["model"] == "modelo/x"


async def test_temperatura_invalida_responde_422(api: Api) -> None:
    admin, user, _, _, _ = await _world(api)
    response = await api.client.put(
        f"/api/v1/users/{user.id}/ai-settings", json={"temperature": 3}, headers=admin.headers
    )
    assert response.status_code == 422


async def test_usuario_inexistente_responde_404(api: Api) -> None:
    admin, _, _, _, _ = await _world(api)
    response = await api.client.get(f"/api/v1/users/{uuid4()}/ai-settings", headers=admin.headers)
    assert response.status_code == 404


async def test_lista_modelos_e_analisa_com_o_escolhido(api: Api) -> None:
    _, user, _, _, conversation = await _world(api)
    listing = await api.client.get("/api/v1/analysis-models", headers=user.headers)
    assert listing.status_code == 200
    assert listing.json()["default_model"] == "modelo/padrao"
    assert listing.json()["models"][1]["input_price"] == 1.0

    result = await api.client.post(
        BASE,
        json={"conversation_id": conversation, "prompt_text": "Resuma", "model": "modelo/y"},
        headers=user.headers,
    )
    assert result.json()["model"] == "modelo/y"


async def test_modelo_invalido_responde_422(api: Api) -> None:
    _, user, _, _, conversation = await _world(api)
    response = await api.client.post(
        BASE,
        json={"conversation_id": conversation, "prompt_text": "Resuma", "model": "inventado"},
        headers=user.headers,
    )
    assert response.status_code == 422
    assert response.json()["code"] == "model_not_available"
