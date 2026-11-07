/**
 * Conteúdo do pitch deck e do Business Model Canvas. Fonte: `docs/pitch.md` e
 * `docs/business-model-canvas.html`; ao mudar um, mude o outro.
 */

/** O diferencial, repetido no deck e no canvas. */
export const EDGE =
  'O Atentio lê as conversas onde o cliente já fala, sem migrar canal e sem ninguém digitar nada.'

export interface SlideCard {
  title: string
  text: string
}

/**
 * Tipos de slide do pitch deck:
 * - `cover`: capa com o nome e a frase de posicionamento;
 * - `statement`: uma frase grande, para o gancho e o pedido;
 * - `bullets`: título e tópicos;
 * - `flow`: etapas em sequência, ligadas por setas;
 * - `cards`: título e cartões lado a lado.
 */
export type Slide =
  | { kind: 'cover'; title: string; subtitle: string; tagline: string }
  | { kind: 'statement'; eyebrow: string; title: string; subtitle?: string }
  | { kind: 'bullets'; eyebrow: string; title: string; bullets: string[]; note?: string }
  | { kind: 'flow'; eyebrow: string; title: string; steps: SlideCard[]; note?: string }
  | { kind: 'cards'; eyebrow: string; title: string; cards: SlideCard[]; note?: string }

export const PITCH_DECK: Slide[] = [
  {
    kind: 'cover',
    title: 'Atentio',
    subtitle: 'O copiloto agêntico do gestor de Customer Success',
    tagline: 'Nenhum cliente esquecido.',
  },
  {
    kind: 'statement',
    eyebrow: 'Imagine',
    title: 'Você cuida de 80 contas. Qual delas está esperando resposta desde ontem?',
  },
  {
    kind: 'bullets',
    eyebrow: 'Problema',
    title: 'O relacionamento se perde no volume',
    bullets: [
      'O gestor de CS conversa com dezenas de clientes ao mesmo tempo.',
      'As conversas estão espalhadas em grupos de WhatsApp e canais de Slack.',
      'Pedidos, reclamações e sinais de risco se perdem no meio das mensagens.',
      'O cliente percebe antes do gestor.',
    ],
  },
  {
    kind: 'cards',
    eyebrow: 'Solução',
    title: 'Conecte os canais e pergunte ao agente',
    cards: [
      { title: 'Quem espera resposta?', text: '"Quais clientes estão sem resposta hoje?"' },
      { title: 'Resumo por conta', text: '"Resuma o grupo da conta X desta semana."' },
      { title: 'Sinais de risco', text: '"Algum cliente demonstrou insatisfação?"' },
    ],
    note: 'As conversas chegam numa caixa única. O agente responde sob demanda, na plataforma e no Claude, via MCP.',
  },
  {
    kind: 'flow',
    eyebrow: 'Como funciona',
    title: 'Da conversa à tarefa, com uma pessoa no controle',
    steps: [
      { title: 'Conectores', text: 'WhatsApp hoje; Slack, Teams, Discord e ClickUp em seguida. Só leitura.' },
      { title: 'Agentes', text: 'Coletor, extrator, analista e estruturador leem e organizam a conversa.' },
      { title: 'Revisão humana', text: 'O publicador propõe resumo e pendências; a pessoa aprova, edita ou descarta.' },
      { title: 'Destinos', text: 'Notion, Jira, ClickUp e Azure DevOps, por MCP. E o Claude consulta tudo.' },
    ],
  },
  {
    kind: 'bullets',
    eyebrow: 'Diferencial',
    title: 'Onde o cliente já fala',
    bullets: [
      'Sem migrar canal: o cliente continua no WhatsApp e no Slack.',
      'Zero digitação: nenhum CRM para preencher.',
      'Somente leitura: a Atentio nunca envia mensagem em nome do gestor.',
      'Nada é publicado sem aprovação humana.',
    ],
  },
  {
    kind: 'cards',
    eyebrow: 'Para quem',
    title: 'Gestores de Customer Success B2B',
    cards: [
      { title: 'Times de 5 a 50 pessoas', text: 'Que atendem clientes em diversos conectores.' },
      { title: 'A dor', text: 'Pedidos e riscos perdidos no volume de mensagens.' },
      { title: 'O ganho', text: 'Saber quem precisa de atenção hoje, sem ler tudo.' },
    ],
  },
  {
    kind: 'cards',
    eyebrow: 'Modelo de negócio',
    title: 'Assinatura, com piloto assistido',
    cards: [
      { title: 'Receita', text: 'Assinatura por gestor conectado ou plano por empresa.' },
      { title: 'Canais', text: 'Venda direta ao head de CS, comunidades de CS e o conector no Claude.' },
      { title: 'Custos', text: 'Infraestrutura por conta conectada, consumo de IA por análise e implantação.' },
    ],
    note: 'Preços e canais são hipóteses a validar no piloto.',
  },
  {
    kind: 'cards',
    eyebrow: 'Concorrência',
    title: 'Ninguém lê a conversa por conta',
    cards: [
      { title: 'Plataformas de CS', text: 'Gainsight, ChurnZero, SenseData: dependem de CRM e de dados preenchidos.' },
      { title: 'Caixas omnichannel', text: 'Blip, Zenvia, Octadesk: foco em atender e enviar, não no relacionamento.' },
      { title: 'Alternativa atual', text: 'Celular, planilha e memória: custo zero, mas pedidos se perdem.' },
    ],
    note: EDGE,
  },
  {
    kind: 'bullets',
    eyebrow: 'Onde estamos',
    title: 'MVP funcionando',
    bullets: [
      'Plataforma multiempresa, com dados isolados por empresa.',
      'WhatsApp conectado por QR code, com captura das conversas.',
      'Estúdio de análises com cinco agentes e o rastro de cada etapa.',
      'Servidor MCP para consultar as conversas pelo Claude.',
      'Publicação nos destinos com aprovação humana, ainda em modo simulado.',
    ],
  },
  {
    kind: 'statement',
    eyebrow: 'Nosso pedido',
    title: 'Indicação de 3 times de CS para um piloto de 30 dias.',
    subtitle: 'Atentio · nenhum cliente esquecido',
  },
]

export type CanvasBlockId =
  | 'parcerias'
  | 'atividades'
  | 'recursos'
  | 'proposta'
  | 'relacionamento'
  | 'canais'
  | 'segmento'
  | 'custos'
  | 'receita'

export interface CanvasBlock {
  id: CanvasBlockId
  number: number
  title: string
  items: string[]
}

/** Na ordem de leitura do canvas: da esquerda para a direita, custos e receita embaixo. */
export const CANVAS: CanvasBlock[] = [
  {
    id: 'parcerias',
    number: 8,
    title: 'Parcerias-chave',
    items: ['Anthropic (Claude e MCP)', 'OpenRouter (modelos)', 'Slack', 'Evolution API (WhatsApp)', 'Provedor de VPS'],
  },
  {
    id: 'atividades',
    number: 7,
    title: 'Atividades-chave',
    items: ['Captura sem perda', 'Agente e análises', 'Novos canais (Slack)', 'Segurança e privacidade'],
  },
  {
    id: 'recursos',
    number: 6,
    title: 'Recursos-chave',
    items: ['Agente de IA', 'Caixa única multicanal', 'Servidor MCP', 'Plataforma multiempresa'],
  },
  {
    id: 'proposta',
    number: 2,
    title: 'Proposta de valor',
    items: [
      'Nenhum cliente esquecido',
      'Quem está sem resposta hoje',
      'Resumo semanal por conta',
      'Sinais de risco nas conversas',
      'Zero digitação: sem CRM para preencher',
      'Somente leitura',
    ],
  },
  {
    id: 'relacionamento',
    number: 4,
    title: 'Relacionamento',
    items: ['Implantação por empresa', 'Prompts de CS prontos', 'Piloto assistido de 30 dias'],
  },
  {
    id: 'canais',
    number: 3,
    title: 'Canais',
    items: ['Venda direta ao head de CS', 'Comunidades de CS', 'Conector no Claude (MCP)'],
  },
  {
    id: 'segmento',
    number: 1,
    title: 'Segmento de clientes',
    items: [
      'Gestores de CS B2B',
      'Times de 5 a 50 pessoas',
      'Atendem clientes em diversos conectores',
      'Dor: pedidos e riscos perdidos no volume',
    ],
  },
  {
    id: 'custos',
    number: 9,
    title: 'Estrutura de custos',
    items: ['Infraestrutura por conta conectada', 'Consumo de IA por análise', 'Implantação e suporte'],
  },
  {
    id: 'receita',
    number: 5,
    title: 'Fontes de receita',
    items: ['Assinatura por gestor conectado', 'Plano por empresa', 'Valores a validar no piloto'],
  },
]

export interface Competitor {
  title: string
  who: string
  description: string
}

export const COMPETITORS: Competitor[] = [
  {
    title: 'Plataformas de Customer Success',
    who: 'Gainsight, ChurnZero, Totango, Vitally, Planhat; no Brasil, SenseData e CustomerX',
    description:
      'Saúde da conta a partir de CRM, produto e cadastros. Dependem de integração e de dados preenchidos pelo time.',
  },
  {
    title: 'Caixas de atendimento omnichannel',
    who: 'Blip, Zenvia, Octadesk, Kommo',
    description:
      'Centralizam e respondem mensagens em escala, com foco em atendimento e envio, não no relacionamento por conta.',
  },
  {
    title: 'Alternativa atual',
    who: 'WhatsApp e Slack no celular, planilha e memória do gestor',
    description: 'Custo zero, mas pedidos e sinais de risco se perdem no volume.',
  },
]
