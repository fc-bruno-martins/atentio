"""Coletor: resume as mensagens do recorte para os próximos agentes."""

from collections.abc import Sequence
from typing import Any

from app.domain.message import Message


def collect_summary(messages: Sequence[Message]) -> dict[str, Any]:
    """Resumo do que foi coletado, sem copiar o conteúdo das mensagens."""
    people: dict[str, int] = {}
    for message in messages:
        name = "Eu" if message.from_me else (message.sender_name or "Contato")
        people[name] = people.get(name, 0) + 1
    ranked = sorted(people.items(), key=lambda item: -item[1])
    with_text = [m for m in messages if m.text]
    return {
        "mensagens": len(messages),
        "com_texto": len(with_text),
        "midias": len(messages) - len(with_text),
        "participantes": [{"nome": name, "mensagens": count} for name, count in ranked[:8]],
        "inicio": messages[0].sent_at.isoformat() if messages else None,
        "fim": messages[-1].sent_at.isoformat() if messages else None,
        "caracteres": sum(len(m.text or "") for m in messages),
    }
