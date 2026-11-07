"""Conectores de saída: para onde o agente publicador leva o resultado aprovado.

A publicação acontece por chamadas de ferramenta MCP (`tools/call`) no conector de destino.
Enquanto não há credenciais dos sistemas de destino, a entrega roda em modo demonstração:
o pacote MCP é montado e registrado, mas nada sai da plataforma.
"""

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class OutputStatus(StrEnum):
    DEMO = "demo"
    BLOCKED = "blocked"


@dataclass(frozen=True)
class OutputConnector:
    id: str
    name: str
    action: str
    tool: str
    status: OutputStatus = OutputStatus.DEMO
    note: str | None = None
    # Uma chamada por item (tarefas) ou uma chamada com tudo (página, mensagem).
    per_item: bool = True


OUTPUTS: tuple[OutputConnector, ...] = (
    OutputConnector(
        "notion",
        "Notion",
        "Cria uma página com o resumo e as pendências do cliente",
        "notion.create_page",
        per_item=False,
    ),
    OutputConnector("jira", "Jira", "Cria uma issue por pendência", "jira.create_issue"),
    OutputConnector("clickup", "ClickUp", "Cria uma tarefa por pendência", "clickup.create_task"),
    OutputConnector(
        "azure_devops",
        "Azure DevOps",
        "Cria um work item por pendência",
        "azure_devops.create_work_item",
    ),
    OutputConnector(
        "whatsapp",
        "WhatsApp",
        "Envia o resumo para a pessoa responsável",
        "whatsapp.send_message",
        status=OutputStatus.BLOCKED,
        note="Bloqueado: a Atentio é somente leitura no WhatsApp (ADR 0009).",
        per_item=False,
    ),
)


def output_by_id(output_id: str) -> OutputConnector | None:
    return next((o for o in OUTPUTS if o.id == output_id), None)


@dataclass(frozen=True)
class DeliveryResult:
    """Resposta do conector de saída a uma chamada de ferramenta."""

    status: str
    reference: str | None = None
    message: str | None = None
    # Como o item ficou no destino (chave, estado, quadro…), para mostrar na tela.
    item: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class McpSession:
    """Resultado do handshake MCP (`initialize` + `tools/list`) com o conector de saída."""

    server: str
    workspace: str
    tools: Sequence[str]


@dataclass(frozen=True)
class ProposedItem:
    title: str
    owner: str | None = None
    due: str | None = None


@dataclass(frozen=True)
class Proposal:
    """O que o publicador propõe levar adiante; a pessoa revisa antes de publicar."""

    summary: str
    items: Sequence[ProposedItem] = field(default_factory=tuple)


_EMPTY = {"sem responsável", "sem prazo", "-", "—", ""}


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip().strip("*").strip()
    return None if value.lower() in _EMPTY else value


def propose(markdown: str) -> Proposal:
    """Resumo da seção "Resumo" e itens das caixas de pendência (`- [ ] tarefa — dono — prazo`)."""
    summary_lines: list[str] = []
    section = ""
    items: list[ProposedItem] = []
    for line in markdown.splitlines():
        stripped = line.strip()
        heading = re.match(r"^#{1,4}\s+(.*)$", stripped)
        if heading:
            section = heading.group(1).strip().lower()
            continue
        task = re.match(r"^[-*]\s+\[ \]\s+(.*)$", stripped)
        if task:
            parts = re.split(r"\s+[\u2014\u2013-]\s+", task.group(1))
            title = _clean(parts[0]) or parts[0]
            items.append(
                ProposedItem(
                    title=title[:200],
                    owner=_clean(parts[1]) if len(parts) > 1 else None,
                    due=_clean(parts[2]) if len(parts) > 2 else None,
                )
            )
        elif section.startswith("resumo") and stripped:
            summary_lines.append(stripped)
    summary = " ".join(summary_lines) or markdown.strip()[:600]
    return Proposal(summary=summary[:2000], items=items[:30])


def tool_calls(
    connector: OutputConnector, proposal: Proposal, *, title: str
) -> list[dict[str, Any]]:
    """Chamadas `tools/call` que o conector de saída receberia."""
    if not connector.per_item:
        checklist = "\n".join(
            f"- [ ] {item.title}"
            + (f" — {item.owner}" if item.owner else "")
            + (f" — {item.due}" if item.due else "")
            for item in proposal.items
        )
        body = proposal.summary + (f"\n\nPendências:\n{checklist}" if checklist else "")
        return [{"name": connector.tool, "arguments": {"title": title, "content": body}}]
    return [
        {
            "name": connector.tool,
            "arguments": _compact(
                {
                    "title": item.title,
                    "description": f"{title}\n\n{proposal.summary}",
                    "assignee": item.owner,
                    "due": item.due,
                }
            ),
        }
        for item in proposal.items
    ]


def _compact(data: Mapping[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in data.items() if value is not None}
