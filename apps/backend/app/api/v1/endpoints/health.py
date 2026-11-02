"""Sinais técnicos para o orquestrador (exceção do Princípio II, ver plan.md)."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.api.v1.dependencies import ContainerDep

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(container: ContainerDep) -> JSONResponse:
    status = await container.database_probe.check()
    if status.available:
        return JSONResponse({"status": "ok"})
    return JSONResponse({"status": "unavailable"}, status_code=503)
