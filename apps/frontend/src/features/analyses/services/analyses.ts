import { apiFetch, apiSend } from '@/lib/api'

export interface Analysis {
  id: string
  conversation_id: string | null
  prompt_text: string
  model: string
  status: 'done' | 'failed'
  result: string | null
  message_count: number
  created_at: string
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
  model?: string
  since?: string
  until?: string
  message_ids?: string[]
}

export const fetchAnalyses = () => apiFetch<Analysis[]>('/api/v1/analyses')
export const runAnalysis = (input: AnalysisInput) =>
  apiSend<Analysis>('/api/v1/analyses', 'POST', input)

export const fetchPrompts = () => apiFetch<AnalysisPrompt[]>('/api/v1/analysis-prompts')
export const createPrompt = (title: string, body: string) =>
  apiSend<AnalysisPrompt>('/api/v1/analysis-prompts', 'POST', { title, body })
export const deletePrompt = (id: string) =>
  apiSend<void>(`/api/v1/analysis-prompts/${id}`, 'DELETE')
