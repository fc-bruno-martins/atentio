"""Rotas entre serviços. Nunca devem ser expostas pelo proxy público (ADR 0009)."""

from fastapi import APIRouter, status

from app.api.v1.dependencies import (
    EvolutionWebhookDep,
    InternalTokenDep,
    MessageServiceDep,
    NumberSyncServiceDep,
)
from app.infrastructure.evolution_messages import MESSAGES_UPSERT, parse_messages
from app.schemas.numbers import EvolutionEvent, ReconcileOut

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/webhooks/evolution", status_code=status.HTTP_204_NO_CONTENT)
async def evolution_webhook(
    event: EvolutionEvent,
    _: EvolutionWebhookDep,
    sync: NumberSyncServiceDep,
    messages: MessageServiceDep,
) -> None:
    if event.event == MESSAGES_UPSERT:
        await messages.capture(event.instance, parse_messages(event.data))
        return
    data = event.data if isinstance(event.data, dict) else {}
    state = data.get("state")
    reason = data.get("statusReason")
    await sync.handle_event(
        event.event,
        event.instance,
        state if isinstance(state, str) else None,
        reason if isinstance(reason, int) else None,
    )


@router.post("/numbers/reconcile")
async def reconcile_numbers(
    _: InternalTokenDep, sync: NumberSyncServiceDep, messages: MessageServiceDep
) -> ReconcileOut:
    summary = await sync.reconcile()
    summary.purged = await messages.purge_expired()
    if summary.whatsapp_available:
        await messages.fill_group_names()
    return ReconcileOut(
        expired=summary.expired,
        confirmed=summary.confirmed,
        disconnected=summary.disconnected,
        removed=summary.removed,
        purged=summary.purged,
        whatsapp_available=summary.whatsapp_available,
    )
