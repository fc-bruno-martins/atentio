from fastapi import APIRouter

from app.api.v1.endpoints import account, auth, companies, invitations, platform, users

api_router = APIRouter(prefix="/api/v1")
for module in (auth, account, companies, users, invitations, platform):
    api_router.include_router(module.router)
