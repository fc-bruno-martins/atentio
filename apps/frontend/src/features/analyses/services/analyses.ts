import { apiFetch, apiSend } from '@/lib/api'

export type AgentName = 'coletor' | 'extrator' | 'analista' | 'estruturador' | 'publicador'
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'waiting' | 'skipped'

/** O que um agente recebeu, o que fez e o que entregou. */
export interface AgentStep {
  agent: AgentName
  status: StepStatus
  model: string | null
  input: Record<string, unknown>
  output: Record<string, unknown>
  started_at: string | null
  finished_at: string | null
  /** Debug do harness: eventos em ordem (prompt, chamada, resposta, repasse…). */
  events?: AgentEvent[]
  /** Latência e tokens da etapa. */
  metrics?: Record<string, number | null>
}

export interface AgentEvent {
  at: string
  kind: string
  message: string
  data: Record<string, unknown>
}

export interface Analysis {
  id: string
  conversation_id: string | null
  prompt_text: string
  model: string
  status: 'running' | 'done' | 'failed'
  result: string | null
  message_count: number
  created_at: string
  steps?: AgentStep[]
}

export interface AnalysisPrompt {
  id: string
  title: string
  body: string
}

export interface AnalysisInput {
  conversation_id: string
  prompt_id?: string
  prompt_text?: string
  preset?: string
  since?: string
  until?: string
  message_ids?: string[]
}

export const fetchAnalyses = () => apiFetch<Analysis[]>('/api/v1/analyses')
/** Começa a análise; os agentes trabalham em segundo plano. */
export const startAnalysis = (input: AnalysisInput) =>
  apiSend<Analysis>('/api/v1/analyses', 'POST', input)
export const fetchAnalysis = (id: string) => apiFetch<Analysis>(`/api/v1/analyses/${id}`)

export const fetchPrompts = () => apiFetch<AnalysisPrompt[]>('/api/v1/analysis-prompts')
export const createPrompt = (title: string, body: string) =>
  apiSend<AnalysisPrompt>('/api/v1/analysis-prompts', 'POST', { title, body })
export const deletePrompt = (id: string) =>
  apiSend<void>(`/api/v1/analysis-prompts/${id}`, 'DELETE')

export interface PublishItem {
  title: string
  owner?: string | null
  due?: string | null
}

export interface PublishDecision {
  approve: boolean
  destinations?: string[]
  summary?: string
  items?: PublishItem[]
}

/** Revisão humana: aprova e publica nos conectores de saída, ou descarta. */
export const publishAnalysis = (id: string, decision: PublishDecision) =>
  apiSend<Analysis>(`/api/v1/analyses/${id}/publish`, 'POST', decision)
