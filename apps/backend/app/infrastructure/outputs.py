"""Conectores de saída simulados (mock): imitam o handshake MCP e a criação dos itens.

Nada sai da plataforma. As chaves e ids seguem o formato de cada ferramenta para a
demonstração ficar realista, e toda entrega vem marcada como "simulado".
"""

import itertools
from collections.abc import Mapping
from typing import Any
from uuid import uuid4

from app.domain.outputs import DeliveryResult, McpSession, OutputConnector

# Ferramentas que cada servidor MCP de exemplo anuncia no `tools/list`.
TOOLS: dict[str, list[str]] = {
    "notion": ["notion.create_page", "notion.search", "notion.append_block"],
    "jira": [
        "jira.create_issue",
        "jira.search_issues",
        "jira.add_comment",
        "jira.transition_issue",
    ],
    "clickup": ["clickup.create_task", "clickup.get_lists", "clickup.add_comment"],
    "azure_devops": [
        "azure_devops.create_work_item",
        "azure_devops.query_work_items",
        "azure_devops.add_comment",
    ],
}
WORKSPACES: dict[str, str] = {
    "notion": "Workspace Customer Success",
    "jira": "Projeto CS · Customer Success",
    "clickup": "Space CS · Lista Follow-ups",
    "azure_devops": "Org atentio-demo · Board CS",
}
MESSAGE = "Simulação: o item foi criado no destino de exemplo; nada saiu da plataforma."


class MockOutputGateway:
    def __init__(self) -> None:
        self._sequence = itertools.count(101)

    async def connect(self, connector: OutputConnector) -> McpSession:
        return McpSession(
            server=f"mcp-{connector.id.replace('_', '-')} (simulado)",
            workspace=WORKSPACES.get(connector.id, "Exemplo"),
            tools=TOOLS.get(connector.id, [connector.tool]),
        )

    async def deliver(self, connector: OutputConnector, call: Mapping[str, Any]) -> DeliveryResult:
        args = call.get("arguments", {})
        number = next(self._sequence)
        title = str(args.get("title", ""))
        common = {"titulo": title, "responsavel": args.get("assignee"), "prazo": args.get("due")}
        if connector.id == "jira":
            key = f"CS-{number}"
            item = {**common, "chave": key, "tipo": "Task", "estado": "To Do", "projeto": "CS"}
        elif connector.id == "clickup":
            key = f"#{uuid4().hex[:9]}"
            item = {**common, "chave": key, "estado": "to do", "lista": "Follow-ups"}
        elif connector.id == "azure_devops":
            key = f"#{4400 + number}"
            item = {**common, "chave": key, "tipo": "Task", "estado": "New", "area": "CS"}
        elif connector.id == "notion":
            key = f"pagina-{uuid4().hex[:12]}"
            content = str(args.get("content", ""))
            item = {
                "titulo": title,
                "chave": key,
                "banco": "Clientes · Acompanhamento",
                "blocos": [line for line in content.splitlines() if line.strip()][:12],
            }
        else:
            key = f"{connector.id}-{number}"
            item = {**common, "chave": key}
        return DeliveryResult(status="simulado", reference=key, message=MESSAGE, item=item)
