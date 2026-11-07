"""Análises de exemplo: o pipeline real de agentes, com respostas roteirizadas no lugar do modelo.

Assim o Debug do harness mostra um rastro verdadeiro sem chave do OpenRouter nem custo.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.domain.agents import EXTRACTOR_SYSTEM
from app.domain.analysis import Completion, CompletionRequest, ModelOption


@dataclass(frozen=True)
class Script:
    """O que o extrator e o analista "respondem" para uma conversa."""

    thread: str
    prompt: str
    facts: dict[str, object]
    answer: str
    # Destinos aprovados na revisão humana; vazio deixa a análise aguardando a revisão.
    publish_to: tuple[str, ...] = ()


class DemoClock:
    """Relógio que avança com a "latência" do modelo, para a cascata de tempos fazer sentido."""

    def __init__(self, start: datetime) -> None:
        self.now = start

    def __call__(self) -> datetime:
        self.now += timedelta(milliseconds=40)
        return self.now


class ScriptedModel:
    EXTRACTOR_LATENCY_MS = 1850
    ANALYST_LATENCY_MS = 6420

    def __init__(self, script: Script, clock: DemoClock) -> None:
        self._script = script
        self._clock = clock

    @property
    def configured(self) -> bool:
        return True

    async def complete(self, request: CompletionRequest) -> Completion:
        if request.system == EXTRACTOR_SYSTEM:
            text = json.dumps(self._script.facts, ensure_ascii=False)
            latency = self.EXTRACTOR_LATENCY_MS
        else:
            text = self._script.answer
            latency = self.ANALYST_LATENCY_MS
        self._clock.now += timedelta(milliseconds=latency)
        return Completion(
            text=text,
            input_tokens=(len(request.system) + len(request.user)) // 4,
            output_tokens=len(text) // 4,
            latency_ms=latency,
        )

    async def list_models(self) -> Sequence[ModelOption]:
        return []


SCRIPTS: tuple[Script, ...] = (
    Script(
        thread="horizonte",
        prompt="Resuma a conversa e aponte riscos e pendências com este cliente.",
        facts={
            "assuntos": ["Falhas na integração do rastreamento", "Relatório do incidente"],
            "pedidos": [
                {"quem": "Marcos Andrade", "o_que": "Relatório com causa e plano de prevenção"},
                {"quem": "Juliana Reis", "o_que": "Saber se os dados perdidos são recuperáveis"},
            ],
            "compromissos": [
                {"quem": "Eu", "o_que": "Enviar o relatório do incidente", "prazo": "sexta"},
                {"quem": "Eu", "o_que": "Reunião técnica com a integração", "prazo": "quinta 10h"},
            ],
            "decisoes": ["Reunião técnica na quinta às 10h"],
            "datas": [{"quando": "fim do mês", "o_que": "Revisão de fornecedores da Horizonte"}],
        },
        answer="""## Resumo
A Horizonte Logística teve a terceira falha de integração do rastreamento no mês e perdeu dados
de uma madrugada. Marcos Andrade, diretor de operações, cobrou hoje o relatório prometido e
avisou que a diretoria vai rever o contrato no fim do mês se a estabilidade não melhorar.

## Saúde do relacionamento
Em risco. O cliente reconhece o atendimento rápido, mas a repetição das falhas desgastou a
confiança, e há duas mensagens de hoje sem resposta.

## Riscos
- Ameaça explícita de rever o contrato na revisão de fornecedores do fim do mês.
- Relatório do incidente cobrado hoje, com a diretoria esperando amanhã cedo.
- Dados perdidos entre 22h e 2h ainda sem resposta sobre recuperação.

## Decisões
- Reunião técnica com a equipe de integração na quinta às 10h.

## Pendências
- [ ] Enviar o relatório do incidente com causa e plano de prevenção — Eu — hoje
- [ ] Responder se os dados perdidos podem ser recuperados — Eu — hoje
- [ ] Levar a estabilidade da integração ao time de produto com prioridade alta — Eu — amanhã
- [ ] Confirmar a pauta da reunião técnica de quinta com a Juliana — Eu — quarta

## Próximos passos
1. Responder Marcos e Juliana ainda hoje, com data firme para o relatório.
2. Trazer o time de produto para a reunião de quinta.
3. Preparar um plano de estabilidade para apresentar antes da revisão de fornecedores.""",
    ),
    Script(
        thread="nuvem",
        prompt="Quais compromissos assumimos com este cliente e o que está em aberto?",
        facts={
            "assuntos": ["Lentidão na API de conciliação", "SLA e crédito contratual"],
            "pedidos": [
                {"quem": "Lucas Prado", "o_que": "Relatório do incidente para o comitê de risco"},
                {"quem": "Aline Ferraz", "o_que": "Discutir crédito pelo SLA"},
            ],
            "compromissos": [
                {"quem": "Eu", "o_que": "Levantar o impacto no SLA", "prazo": "reunião mensal"},
            ],
            "decisoes": ["Incidente entra no cálculo de SLA do mês"],
            "datas": [{"quando": "terça 14h", "o_que": "Reunião mensal com o diretor de TI"}],
        },
        answer="""## Resumo
A Nuvem Pagamentos teve lentidão na API de conciliação por cerca de duas horas. A causa foi
corrigida no mesmo dia, mas o cliente quer o relatório do incidente para o comitê de risco e
vai discutir crédito de SLA na reunião mensal, que deve ser na terça às 14h.

## Saúde do relacionamento
Atenção. A resposta ao incidente foi elogiada, mas o tema agora é contratual e envolve a
diretoria de tecnologia do cliente.

## Riscos
- Pedido de crédito por descumprimento do SLA de 99,9%.
- Relatório do incidente cobrado de novo hoje, ainda sem data.

## Decisões
- O incidente entra no cálculo do SLA do mês.

## Pendências
- [ ] Enviar o relatório do incidente ao Lucas — Eu — amanhã
- [ ] Calcular o impacto no SLA e a proposta de crédito — Eu — segunda
- [ ] Confirmar a reunião mensal de terça às 14h com o diretor de TI — Eu — hoje

## Próximos passos
1. Responder ao Lucas com a data do relatório.
2. Confirmar a reunião de terça e levar a proposta de crédito pronta.""",
        publish_to=("notion", "jira"),
    ),
)
