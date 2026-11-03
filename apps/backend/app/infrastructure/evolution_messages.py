"""Traduz o evento de mensagem da Evolution API para o domínio."""

from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.domain.message import IncomingMessage, MessageType

log = get_logger(__name__)

MESSAGES_UPSERT = "messages.upsert"
IGNORED_SUFFIXES = ("@broadcast", "@newsletter")
LID_SUFFIX = "@lid"
# Controle do protocolo, sem conteúdo para a pessoa.
IGNORED_TYPES = {
    "protocolMessage",
    "reactionMessage",
    "senderKeyDistributionMessage",
    "messageContextInfo",
}
TYPES = {
    "conversation": MessageType.TEXT,
    "extendedTextMessage": MessageType.TEXT,
    "imageMessage": MessageType.IMAGE,
    "audioMessage": MessageType.AUDIO,
    "videoMessage": MessageType.VIDEO,
    "documentMessage": MessageType.DOCUMENT,
    "documentWithCaptionMessage": MessageType.DOCUMENT,
    "stickerMessage": MessageType.STICKER,
}


def _text(content: dict[str, Any]) -> str | None:
    if isinstance(content.get("conversation"), str):
        return content["conversation"] or None
    for value in content.values():
        if isinstance(value, dict):
            found = value.get("text") or value.get("caption")
            if isinstance(found, str) and found:
                return found
    return None


def _message_type(data: dict[str, Any], content: dict[str, Any]) -> MessageType | None:
    declared = data.get("messageType")
    keys = [declared] if isinstance(declared, str) else []
    keys += [key for key in content if key not in IGNORED_TYPES]
    if declared in IGNORED_TYPES or not keys:
        return None
    return next((TYPES[key] for key in keys if key in TYPES), MessageType.OTHER)


def _resolve_jid(key: dict[str, Any]) -> str:
    jid: str = key["remoteJid"]
    if jid.endswith(LID_SUFFIX):
        for field in ("remoteJidAlt", "senderPn"):
            alternative = key.get(field)
            if isinstance(alternative, str) and alternative:
                return alternative
    return jid


def _parse_one(data: dict[str, Any]) -> IncomingMessage | None:
    key, content = data["key"], data.get("message")
    if not isinstance(content, dict):
        return None
    jid = _resolve_jid(key)
    message_type = _message_type(data, content)
    if jid.endswith(IGNORED_SUFFIXES) or message_type is None:
        return None
    return IncomingMessage(
        external_id=key["id"],
        remote_jid=jid,
        from_me=bool(key.get("fromMe")),
        sender_jid=key.get("participant") or None,
        sender_name=data.get("pushName") or None,
        type=message_type,
        text=_text(content),
        sent_at=datetime.fromtimestamp(int(data["messageTimestamp"]), UTC),
    )


def parse_messages(data: object) -> list[IncomingMessage]:
    """Formato inesperado é ignorado: uma entrega ruim não pode travar as demais."""
    items = data if isinstance(data, list) else [data]
    parsed = []
    for item in items:
        try:
            message = _parse_one(item)  # type: ignore[arg-type]
        except (KeyError, TypeError, ValueError, AttributeError) as error:
            log.warning("mensagem_ignorada", error=type(error).__name__)
            continue
        if message is not None:
            parsed.append(message)
    return parsed
