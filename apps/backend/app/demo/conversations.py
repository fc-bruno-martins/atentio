"""Conversas fictícias de um time de Customer Success, no WhatsApp e no Slack.

Empresas, pessoas e telefones são inventados. Os horários são relativos ao momento do seed,
para que tudo fique dentro da retenção e "hoje" seja sempre hoje.
"""

from dataclasses import dataclass, field
from datetime import timedelta

from app.domain.message import ConversationKind

WHATSAPP = "whatsapp"
SLACK = "slack"
# `None` como autor é a própria pessoa do seed ("Eu").
ME = None


def at(days: int = 0, hours: int = 0, minutes: int = 0) -> timedelta:
    """Quanto tempo antes do seed a mensagem foi enviada."""
    return timedelta(days=days, hours=hours, minutes=minutes)


@dataclass(frozen=True)
class Line:
    ago: timedelta
    author: str | None
    text: str


@dataclass(frozen=True)
class Thread:
    key: str
    channel: str
    external_ref: str
    kind: ConversationKind
    name: str
    lines: tuple[Line, ...]
    # Identificador de cada autor no canal (JID no WhatsApp, ID de usuário no Slack).
    people: dict[str, str] = field(default_factory=dict)


THREADS: tuple[Thread, ...] = (
    Thread(
        key="horizonte",
        channel=WHATSAPP,
        external_ref="120363000000000101@g.us",
        kind=ConversationKind.GROUP,
        name="Horizonte Logística · Atentio",
        people={
            "Marcos Andrade": "5562900000101@s.whatsapp.net",
            "Juliana Reis": "5562900000102@s.whatsapp.net",
        },
        lines=(
            Line(
                at(4, 6),
                "Juliana Reis",
                "Bom dia! A integração do rastreamento parou de novo ontem à noite. Os pedidos de "
                "Anápolis não aparecem no painel.",
            ),
            Line(
                at(4, 5, 40),
                ME,
                "Bom dia, Juliana. Já abri o chamado com prioridade alta e volto com uma posição "
                "até o fim do dia.",
            ),
            Line(
                at(4, 1),
                ME,
                "Atualização: a equipe técnica identificou uma falha no envio dos eventos. "
                "Correção prevista para amanhã.",
            ),
            Line(
                at(3, 7),
                "Juliana Reis",
                "Voltou a funcionar, obrigada! Mas perdemos os dados de ontem entre 22h e 2h.",
            ),
            Line(
                at(3, 6, 30),
                "Marcos Andrade",
                "É a terceira vez neste mês. Preciso de um relatório explicando o que aconteceu e "
                "o que muda daqui para frente.",
            ),
            Line(
                at(3, 6),
                ME,
                "Entendido, Marcos. Envio o relatório até sexta, com a causa e o plano de "
                "prevenção.",
            ),
            Line(
                at(2, 4),
                "Juliana Reis",
                "Podemos marcar uma reunião técnica com o time de vocês? Quinta às 10h funciona "
                "para nós.",
            ),
            Line(
                at(2, 3, 30),
                ME,
                "Quinta às 10h está confirmada. Mando o convite com a equipe de integração.",
            ),
            Line(
                at(1, 5),
                "Marcos Andrade",
                "Pessoal, nossa diretoria vai revisar todos os fornecedores no fim do mês. Se a "
                "estabilidade não melhorar, vamos rever o contrato.",
            ),
            Line(
                at(0, 3, 10),
                "Marcos Andrade",
                "Alguma posição sobre o relatório? A diretoria me cobra amanhã cedo.",
            ),
            Line(
                at(0, 2, 45),
                "Juliana Reis",
                "Também precisamos saber se os dados perdidos podem ser recuperados.",
            ),
        ),
    ),
    Thread(
        key="vida-plena",
        channel=WHATSAPP,
        external_ref="120363000000000102@g.us",
        kind=ConversationKind.GROUP,
        name="Clínica Vida Plena + CS",
        people={
            "Dra. Helena Costa": "5562900000201@s.whatsapp.net",
            "Rafael Moura": "5562900000202@s.whatsapp.net",
        },
        lines=(
            Line(
                at(5, 3),
                "Rafael Moura",
                "Oi! Fechamos o mês com 40% menos faltas nas consultas desde que ativamos os "
                "lembretes.",
            ),
            Line(
                at(5, 2, 50),
                ME,
                "Que notícia boa, Rafael! Posso usar esse número no nosso estudo de caso?",
            ),
            Line(at(5, 2, 20), "Rafael Moura", "Pode sim, só não cite nomes de pacientes."),
            Line(
                at(2, 8),
                "Dra. Helena Costa",
                "Vamos abrir a unidade do Setor Bueno em dezembro. Queremos levar a plataforma "
                "para lá também.",
            ),
            Line(
                at(2, 7, 30),
                "Dra. Helena Costa",
                "Seriam mais 10 licenças. Consegue mandar uma proposta?",
            ),
            Line(
                at(2, 7),
                ME,
                "Claro, Dra. Helena! Preparo a proposta com as 10 licenças e a implantação da nova"
                " unidade.",
            ),
            Line(
                at(1, 2),
                "Rafael Moura",
                "Decidimos começar o piloto na unidade nova no dia 1º de dezembro.",
            ),
            Line(
                at(1, 1, 40),
                ME,
                "Perfeito. Envio a proposta até quarta e já reservo a agenda de treinamento para a"
                " última semana de novembro.",
            ),
        ),
    ),
    Thread(
        key="bom-preco",
        channel=WHATSAPP,
        external_ref="5562900000301@s.whatsapp.net",
        kind=ConversationKind.DIRECT,
        name="Fernanda Lima · Mercado Bom Preço",
        people={"Fernanda Lima": "5562900000301@s.whatsapp.net"},
        lines=(
            Line(
                at(3, 5),
                "Fernanda Lima",
                "Oi! Começamos o uso esta semana. Como cadastro os operadores das outras lojas?",
            ),
            Line(
                at(3, 4, 30),
                ME,
                "Oi, Fernanda! Em Configurações > Equipe. Posso fazer um treinamento rápido com os"
                " gerentes?",
            ),
            Line(at(3, 4), "Fernanda Lima", "Seria ótimo. Sexta às 15h?"),
            Line(at(3, 3, 50), ME, "Combinado: sexta às 15h, por vídeo. Mando o link."),
            Line(
                at(1, 6),
                "Fernanda Lima",
                "O treinamento foi ótimo! Você consegue mandar o material para quem não pôde "
                "participar?",
            ),
            Line(
                at(0, 5),
                "Fernanda Lima",
                "Lembrando do material do treinamento 🙂 Os gerentes da loja 3 estão esperando.",
            ),
        ),
    ),
    Thread(
        key="alicerce",
        channel=WHATSAPP,
        external_ref="5562900000401@s.whatsapp.net",
        kind=ConversationKind.DIRECT,
        name="Ricardo Souza · Construtora Alicerce",
        people={"Ricardo Souza": "5562900000401@s.whatsapp.net"},
        lines=(
            Line(
                at(6, 4),
                ME,
                "Ricardo, tudo bem? O contrato de vocês vence no dia 30. Podemos conversar sobre a"
                " renovação?",
            ),
            Line(
                at(6, 2),
                "Ricardo Souza",
                "Tudo bem! Podemos sim. Estamos avaliando outras opções por causa do preço.",
            ),
            Line(
                at(5, 6),
                ME,
                "Entendo. Posso preparar uma proposta com o plano anual e o uso real de vocês nos "
                "últimos meses.",
            ),
            Line(
                at(1, 9),
                "Ricardo Souza",
                "Recebemos uma proposta 15% mais barata de outro fornecedor. Vocês conseguem "
                "chegar perto?",
            ),
            Line(
                at(1, 8, 50),
                "Ricardo Souza",
                "Preciso dar uma resposta para a diretoria até segunda.",
            ),
        ),
    ),
    Thread(
        key="aprender",
        channel=WHATSAPP,
        external_ref="120363000000000105@g.us",
        kind=ConversationKind.GROUP,
        name="EduTech Aprender · Implantação",
        people={
            "Camila Duarte": "5562900000501@s.whatsapp.net",
            "Bruno Teles": "5562900000502@s.whatsapp.net",
        },
        lines=(
            Line(
                at(4, 8),
                "Bruno Teles",
                "Os relatórios de frequência estão saindo em branco para as turmas da noite.",
            ),
            Line(
                at(4, 7, 30),
                ME,
                "Obrigado pelo aviso, Bruno. Já reproduzimos e o time está corrigindo.",
            ),
            Line(
                at(3, 2),
                ME,
                "Corrigido! Podem gerar de novo. Os relatórios antigos também foram refeitos.",
            ),
            Line(at(3, 1), "Bruno Teles", "Funcionou aqui. Valeu pela agilidade!"),
            Line(
                at(2, 5),
                "Camila Duarte",
                "Respondemos a pesquisa de satisfação: nota 9. O suporte está fazendo diferença.",
            ),
            Line(
                at(2, 4, 40),
                ME,
                "Muito obrigado, Camila! Vamos agendar a revisão trimestral para dezembro?",
            ),
            Line(at(2, 4), "Camila Duarte", "Vamos. Primeira semana de dezembro, qualquer manhã."),
        ),
    ),
    Thread(
        key="nuvem",
        channel=SLACK,
        external_ref="C0DEMO0NUVEM",
        kind=ConversationKind.GROUP,
        name="#ext-nuvem-pagamentos",
        people={
            "Lucas Prado": "U0DEMO0LUCAS",
            "Aline Ferraz": "U0DEMO0ALINE",
        },
        lines=(
            Line(
                at(2, 9),
                "Lucas Prado",
                "Estamos vendo a API de conciliação demorando mais de 8 segundos desde as 9h. Isso"
                " afeta o fechamento do dia.",
            ),
            Line(
                at(2, 8, 50),
                ME,
                "Obrigado, Lucas. Incidente aberto com o time de plataforma. Atualizo aqui a cada "
                "30 minutos.",
            ),
            Line(
                at(2, 7),
                ME,
                "Causa encontrada: um índice do banco de conciliação. Já aplicamos a correção e o "
                "tempo voltou para 400 ms.",
            ),
            Line(
                at(2, 6, 30),
                "Lucas Prado",
                "Confirmado do nosso lado. Precisamos do relatório do incidente para o nosso "
                "comitê de risco.",
            ),
            Line(
                at(1, 7),
                "Aline Ferraz",
                "Pelo contrato, o SLA é de 99,9%. Esse incidente entra no cálculo do mês? Vamos "
                "querer discutir o crédito.",
            ),
            Line(
                at(1, 6, 30),
                ME,
                "Entra, sim. Vou levantar o impacto exato e trago a proposta de crédito na reunião"
                " mensal.",
            ),
            Line(
                at(0, 4),
                "Aline Ferraz",
                "Podemos fazer a reunião mensal na terça às 14h? Quero incluir nosso diretor de "
                "tecnologia.",
            ),
            Line(at(0, 1, 30), "Lucas Prado", "E o relatório do incidente, sai até quando?"),
        ),
    ),
    Thread(
        key="agro-verde",
        channel=SLACK,
        external_ref="C0DEMO0AGRO",
        kind=ConversationKind.GROUP,
        name="#ext-agro-verde",
        people={"Patrícia Gomes": "U0DEMO0PATRICIA", "Diego Martins": "U0DEMO0DIEGO"},
        lines=(
            Line(
                at(5, 5),
                "Diego Martins",
                "Pessoal, a safra começa mês que vem e vamos dobrar o número de usuários no campo.",
            ),
            Line(
                at(5, 4, 30),
                ME,
                "Ótimo, Diego! Vamos planejar a capacidade e o treinamento das equipes novas.",
            ),
            Line(
                at(3, 3),
                "Patrícia Gomes",
                "Para a revisão trimestral, queremos ver o uso por fazenda e o tempo médio de "
                "sincronização offline.",
            ),
            Line(at(3, 2, 30), ME, "Combinado. Monto o painel com esses dois indicadores."),
            Line(
                at(1, 3),
                "Diego Martins",
                "Decidimos ativar o módulo de manutenção de máquinas a partir de janeiro.",
            ),
            Line(
                at(1, 2, 45),
                ME,
                "Excelente! Envio o cronograma de implantação do módulo até o fim da semana.",
            ),
        ),
    ),
    Thread(
        key="patricia",
        channel=SLACK,
        external_ref="D0DEMO0PATRICIA",
        kind=ConversationKind.DIRECT,
        name="Patrícia Gomes · Agro Verde",
        people={"Patrícia Gomes": "U0DEMO0PATRICIA"},
        lines=(
            Line(
                at(1, 4),
                "Patrícia Gomes",
                "Oi! Consegue me mandar o relatório de uso de outubro antes da revisão? Quero "
                "apresentar internamente.",
            ),
            Line(at(1, 3, 50), ME, "Consigo, Patrícia. Te mando até amanhã."),
            Line(at(0, 6), "Patrícia Gomes", "Bom dia! Conseguiu gerar o relatório?"),
        ),
    ),
    Thread(
        key="time-cs",
        channel=SLACK,
        external_ref="C0DEMO0TIMECS",
        kind=ConversationKind.GROUP,
        name="#time-cs",
        people={"Renata Alves": "U0DEMO0RENATA", "Gustavo Lima": "U0DEMO0GUSTAVO"},
        lines=(
            Line(
                at(3, 9),
                "Renata Alves",
                "Prioridades da semana: renovação da Alicerce, expansão da Vida Plena e "
                "estabilidade da Horizonte.",
            ),
            Line(
                at(3, 8, 40),
                "Gustavo Lima",
                "Sigo com a Vida Plena. A Horizonte está crítica, alguém do produto precisa "
                "entrar.",
            ),
            Line(
                at(3, 8, 20),
                ME,
                "Fico com a Horizonte e a Alicerce. Levo a Horizonte para o produto hoje.",
            ),
            Line(
                at(0, 7),
                "Renata Alves",
                "Lembrete: o comitê de renovações é na segunda. Tragam o status das contas em "
                "risco.",
            ),
        ),
    ),
)
