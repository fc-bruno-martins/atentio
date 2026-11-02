export const SESSION_COOKIE = 'judite_session'
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

export const PUBLIC_PATHS = ['/login', '/esqueci-senha', '/redefinir-senha', '/convite']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
