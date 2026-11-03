"""Adapter do OpenRouter. Sem chave, nada é enviado."""

import time
from collections.abc import Callable, Sequence
from typing import Any

import httpx

from app.core.logging import get_logger
from app.domain.analysis import CompletionRequest, ModelOption
from app.domain.errors import AnalysisModelFailed, AnalysisNotConfigured

log = get_logger(__name__)
PER_MILLION = 1_000_000


def _price(value: object) -> float | None:
    """O provedor informa o preço por token; preço negativo significa variável."""
    try:
        price = float(str(value))
    except ValueError:
        return None
    return round(price * PER_MILLION, 4) if price >= 0 else None


def _option(item: dict[str, Any]) -> ModelOption | None:
    outputs = (item.get("architecture") or {}).get("output_modalities") or []
    model_id, name = item.get("id"), item.get("name")
    if "text" not in outputs or not isinstance(model_id, str) or not isinstance(name, str):
        return None
    pricing = item.get("pricing") or {}
    return ModelOption(
        model_id, name, _price(pricing.get("prompt")), _price(pricing.get("completion"))
    )


class OpenRouterModel:
    def __init__(
        self,
        client: httpx.AsyncClient,
        url: str,
        api_key: str | None,
        models_url: str = "",
        models_ttl_seconds: float = 600,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._client = client
        self._url = url
        self._api_key = api_key
        self._models_url = models_url
        self._models_ttl = models_ttl_seconds
        self._clock = clock
        self._models: Sequence[ModelOption] = ()
        self._models_at: float | None = None

    async def list_models(self) -> Sequence[ModelOption]:
        """A lista é pública. Em falha, a última lista conhecida continua valendo."""
        fresh = self._models_at is not None and self._clock() - self._models_at < self._models_ttl
        if fresh:
            return self._models
        try:
            response = await self._client.get(self._models_url)
            response.raise_for_status()
            options = [_option(item) for item in response.json()["data"]]
        except (httpx.HTTPError, KeyError, TypeError, ValueError, AttributeError) as error:
            log.warning("lista_de_modelos_indisponivel", error=type(error).__name__)
            if self._models:
                return self._models
            raise AnalysisModelFailed() from error
        self._models = sorted((o for o in options if o), key=lambda o: o.name.lower())
        self._models_at = self._clock()
        return self._models

    async def complete(self, request: CompletionRequest) -> str:
        if not self._api_key:
            raise AnalysisNotConfigured()
        body: dict[str, Any] = {
            "model": request.model,
            "messages": [
                {"role": "system", "content": request.system},
                {"role": "user", "content": request.user},
            ],
        }
        if request.temperature is not None:
            body["temperature"] = request.temperature
        try:
            response = await self._client.post(
                self._url, json=body, headers={"Authorization": f"Bearer {self._api_key}"}
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise AnalysisModelFailed() from error
        if not isinstance(content, str) or not content:
            raise AnalysisModelFailed()
        return content
