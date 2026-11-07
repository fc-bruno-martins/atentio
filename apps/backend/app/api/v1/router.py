from fastapi import APIRouter

from app.api.v1.endpoints import (
    account,
    analyses,
    auth,
    companies,
    conversations,
    internal,
    invitations,
    mcp,
    numbers,
    platform,
    users,
)

api_router = APIRouter(prefix="/api/v1")
for module in (
    auth,
    account,
    analyses,
    companies,
    users,
    invitations,
    mcp,
    platform,
    numbers,
    internal,
    conversations,
):
    api_router.include_router(module.router)
api_router.include_router(numbers.company_router)
api_router.include_router(numbers.channels_router)
api_router.include_router(mcp.tokens_router)
api_router.include_router(analyses.prompts_router)
api_router.include_router(analyses.models_router)
api_router.include_router(analyses.settings_router)
