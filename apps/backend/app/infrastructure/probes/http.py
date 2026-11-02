import httpx

from app.domain.platform_status import Component, ComponentStatus


class HttpProbe:
    """Disponível se `GET url` responde 2xx."""

    def __init__(self, component: Component, url: str, client: httpx.AsyncClient) -> None:
        self.component = component
        self._url = url
        self._client = client

    async def check(self) -> ComponentStatus:
        try:
            response = await self._client.get(self._url)
        except httpx.HTTPError:
            return ComponentStatus.down(self.component, "serviço inacessível")
        if not response.is_success:
            return ComponentStatus.down(self.component, f"respondeu HTTP {response.status_code}")
        return ComponentStatus.up(self.component)
