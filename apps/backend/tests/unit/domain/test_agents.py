import pytest

from app.domain.agents import parse_facts, preset_by_id, structure

pytestmark = pytest.mark.unit


def test_fatos_em_bloco_de_codigo_sao_lidos() -> None:
    facts = parse_facts('```json\n{"assuntos": ["a"], "decisoes": null}\n```')
    assert facts["assuntos"] == ["a"]
    assert facts["decisoes"] == []
    assert facts["pedidos"] == []


def test_resposta_que_nao_e_json_vira_texto_bruto() -> None:
    assert parse_facts("não sei") == {"bruto": "não sei"}


def test_estrutura_conta_secoes_pendencias_e_decisoes() -> None:
    result = structure("## Resumo\nTexto.\n\n## Decisões\n- A\n- B\n\n## Pendências\n- [ ] C")
    assert [s["titulo"] for s in result["secoes"]] == ["Resumo", "Decisões", "Pendências"]
    assert result["decisoes"] == 2
    assert result["pendencias"] == 1


def test_presets_tem_os_tres_perfis() -> None:
    assert preset_by_id("rapido") and preset_by_id("equilibrado") and preset_by_id("profundo")
    assert preset_by_id("x") is None
