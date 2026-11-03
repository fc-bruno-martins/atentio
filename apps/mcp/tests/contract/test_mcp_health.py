import httpx
import pytest

from app.core.config import Settings
from app.main import create_app

pytestmark = pytest.mark.contract


async def test_health_do_mcp_responde_ok() -> None:
    app = create_app(Settings(backend_url="http://backend"))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://mcp:8001"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
