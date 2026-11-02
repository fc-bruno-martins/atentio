export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

const FALLBACK = 'Não foi possível concluir a ação. Tente novamente.'
const INVALID = 'Verifique os dados informados.'

async function toError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
    const code = 'code' in body && typeof body.code === 'string' ? body.code : 'error'
    return new ApiError(response.status, code, body.message)
  }
  const message = response.status === 422 ? INVALID : FALLBACK
  return new ApiError(response.status, 'error', message)
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    throw new ApiError(0, 'network', 'Não foi possível conectar à plataforma.')
  }
  if (!response.ok) throw await toError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function apiSend<T>(path: string, method: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
