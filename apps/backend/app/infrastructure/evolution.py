"""Adapter da Evolution API. Nenhuma rota escreve no WhatsApp (somente leitura)."""

from typing import Any

import httpx

from app.domain.errors import WhatsAppUnavailable
from app.domain.number import InstanceInfo

WEBHOOK_EVENTS = ["CONNECTION_UPDATE", "LOGOUT_INSTANCE", "MESSAGES_UPSERT"]
READ_ONLY_SETTINGS = {
    "rejectCall": False,
    "groupsIgnore": False,
    "alwaysOnline": False,
    "readMessages": False,
    "readStatus": False,
    "syncFullHistory": False,
}


class EvolutionGateway:
    def __init__(
        self, client: httpx.AsyncClient, base_url: str, webhook_url: str, webhook_secret: str
    ) -> None:
        self._client = client
        self._base = base_url.rstrip("/")
        self._webhook_url = webhook_url
        self._webhook_secret = webhook_secret

    async def create_instance(self, name: str) -> str | None:
        body = await self._request(
            "POST",
            "/instance/create",
            json={
                "instanceName": name,
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": True,
                **READ_ONLY_SETTINGS,
                "webhook": self._webhook(),
            },
        )
        qrcode = body.get("qrcode") if isinstance(body, dict) else None
        return qrcode.get("base64") if isinstance(qrcode, dict) else None

    async def enable_message_events(self, name: str) -> None:
        await self._request(
            "POST", f"/webhook/set/{name}", json={"webhook": {"enabled": True, **self._webhook()}}
        )

    async def get_group_name(self, name: str, group_jid: str) -> str | None:
        body = await self._request(
            "GET", f"/group/findGroupInfos/{name}", params={"groupJid": group_jid}, missing_ok=True
        )
        subject = body.get("subject") if isinstance(body, dict) else None
        return subject if isinstance(subject, str) and subject else None

    def _webhook(self) -> dict[str, Any]:
        return {
            "url": self._webhook_url,
            "byEvents": False,
            "base64": False,
            "headers": {"x-atentio-secret": self._webhook_secret},
            "events": WEBHOOK_EVENTS,
        }

    async def get_qr(self, name: str) -> str | None:
        body = await self._request("GET", f"/instance/connect/{name}")
        return body.get("base64") if isinstance(body, dict) else None

    async def get_instance(self, name: str) -> InstanceInfo | None:
        body = await self._request("GET", "/instance/fetchInstances", params={"instanceName": name})
        if not isinstance(body, list) or not body:
            return None
        instance = body[0]
        return InstanceInfo(
            state=instance["connectionStatus"],
            owner_jid=instance.get("ownerJid"),
            disconnection_code=instance.get("disconnectionReasonCode"),
        )

    async def logout(self, name: str) -> None:
        await self._request("DELETE", f"/instance/logout/{name}", missing_ok=True)

    async def delete(self, name: str) -> None:
        await self._request("DELETE", f"/instance/delete/{name}", missing_ok=True)

    async def _request(
        self, method: str, path: str, *, missing_ok: bool = False, **kwargs: Any
    ) -> Any:
        try:
            response = await self._client.request(method, f"{self._base}{path}", **kwargs)
        except httpx.HTTPError as error:
            raise WhatsAppUnavailable() from error
        # Encerrar o que já não existe ou já saiu não é falha.
        if missing_ok and response.status_code in (400, 404):
            return None
        if not response.is_success:
            raise WhatsAppUnavailable()
        return response.json()
