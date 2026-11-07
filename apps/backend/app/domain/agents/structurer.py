"""Estruturador: organiza a resposta do analista em seções e conta pendências e decisões."""

import re
from typing import Any


def structure(markdown: str) -> dict[str, Any]:
    """Seções da resposta, com itens, pendências e decisões contadas."""
    sections: list[dict[str, Any]] = []
    for line in markdown.splitlines():
        stripped = line.strip()
        heading = re.match(r"^#{1,4}\s+(.*)$", stripped)
        if heading:
            sections.append({"titulo": heading.group(1).strip(), "itens": 0})
        elif stripped:
            if not sections:
                sections.append({"titulo": "Resposta", "itens": 0})
            if re.match(r"^([-*•]|\d+[.)])\s+", stripped) or not stripped.startswith(">"):
                sections[-1]["itens"] += 1
    tasks = len(re.findall(r"^\s*[-*]\s+\[ \]", markdown, flags=re.MULTILINE))
    decisions = sum(s["itens"] for s in sections if s["titulo"].lower().startswith("decis"))
    pending = sum(s["itens"] for s in sections if s["titulo"].lower().startswith("pend"))
    return {
        "secoes": sections,
        "pendencias": max(tasks, pending),
        "decisoes": decisions,
        "palavras": len(markdown.split()),
    }
