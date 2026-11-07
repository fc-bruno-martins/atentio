/**
 * Conteúdo do pitch e do Business Model Canvas. Fonte: `docs/pitch.md` e
 * `docs/business-model-canvas.html`; ao mudar um, mude o outro.
 */

export const PITCH = {
  headline:
    'Atentio é o copiloto agêntico do gestor de Customer Success: lê as conversas com os clientes, aponta quem precisa de atenção e mantém o relacionamento em dia.',
  opening: 'Você cuida de 80 contas. Qual delas está esperando resposta desde ontem?',
  problem:
    'O gestor de CS conversa com dezenas de clientes ao mesmo tempo, em grupos de WhatsApp e canais de Slack. Pedidos, reclamações e sinais de risco se perdem no volume, e o cliente percebe antes do gestor.',
  solution:
    'O gestor conecta seus canais ao Atentio. As conversas chegam numa caixa única e um agente de IA responde, sob demanda:',
  questions: [
    'Quais clientes estão sem resposta hoje?',
    'Resuma o grupo da conta X desta semana.',
    'Algum cliente demonstrou insatisfação?',
  ],
  solutionNote: 'O agente funciona dentro da plataforma e também no Claude, via MCP.',
  edge: 'O Atentio lê as conversas onde o cliente já fala, sem migrar canal e sem ninguém digitar nada.',
  ask: 'Indicação de 3 times de CS para um piloto de 30 dias.',
} as const

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
