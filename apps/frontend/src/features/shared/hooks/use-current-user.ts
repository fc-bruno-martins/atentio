import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser } from '../services/session'

export function useCurrentUser() {
  return useQuery({ queryKey: ['me'], queryFn: fetchCurrentUser, staleTime: 60_000, retry: false })
}
