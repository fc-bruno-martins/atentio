import httpx

RECONCILE_PATH = "/api/v1/internal/numbers/reconcile"


class BackendNumberReconciler:
    def __init__(self, client: httpx.AsyncClient, base_url: str, token: str) -> None:
        self._client = client
        self._url = f"{base_url.rstrip('/')}{RECONCILE_PATH}"
        self._token = token

    async def reconcile(self) -> None:
        response = await self._client.post(
            self._url, headers={"Authorization": f"Bearer {self._token}"}
        )
        response.raise_for_status()
