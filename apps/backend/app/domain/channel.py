"""Catálogo de canais. Canal novo entra aqui e ganha adapter e repository próprios."""

from dataclasses import dataclass
from enum import StrEnum


class ChannelStatus(StrEnum):
    AVAILABLE = "available"
    COMING_SOON = "coming_soon"


@dataclass(frozen=True)
class Channel:
    id: str
    name: str
    status: ChannelStatus


CHANNELS = (
    Channel("whatsapp", "WhatsApp", ChannelStatus.AVAILABLE),
    Channel("slack", "Slack", ChannelStatus.COMING_SOON),
)
