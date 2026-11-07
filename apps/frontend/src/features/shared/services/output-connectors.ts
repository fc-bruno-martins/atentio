import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Destino da publicação: o agente publicador chama a ferramenta MCP do conector. */
export interface OutputConnector {
  id: string
  name: string
  action: string
  tool: string
  status: 'demo' | 'blocked'
  note: string | null
}

export const fetchOutputConnectors = () => apiFetch<OutputConnector[]>('/api/v1/output-connectors')

export const useOutputConnectors = () =>
  useQuery({ queryKey: ['output-connectors'], queryFn: fetchOutputConnectors, staleTime: 60_000 })
