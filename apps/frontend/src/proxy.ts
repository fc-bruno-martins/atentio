import { NextResponse, type NextRequest } from 'next/server'
import { isPublicPath, SESSION_COOKIE } from '@/lib/session-cookie'

/** Só melhora a experiência: quem valida sessão e perfil é o backend. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)
  if (!hasSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|health|_next/static|_next/image|favicon.ico|images).*)'],
}
