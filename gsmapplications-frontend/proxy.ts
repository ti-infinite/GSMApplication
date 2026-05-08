import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const protectedPaths = ['/dashboard']
const publicPaths = ['/login', '/']

function getPathInfo(pathname: string) {
  const segments = pathname.split('/')
  const locale = segments[1]

  const path = '/' + segments.slice(2).join('/')

  return {
    locale,
    path: path === '/' ? '/' : path
  }
}

function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )

    const now = Math.floor(Date.now() / 1000)

    return payload.exp < now
  } catch {
    return true
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { locale, path } = getPathInfo(pathname)

  const token = req.cookies.get('gsm_token')?.value

  const isProtected = protectedPaths.some(
    (r) => path === r || path.startsWith(`${r}/`)
  )

  const isPublic = publicPaths.includes(path)

  const isExpired = token ? isTokenExpired(token) : true

  // TOKEN INVÁLIDO O EXPIRADO
  if (token && isExpired) {
    const res = NextResponse.redirect(
      new URL(`/${locale}/login`, req.url)
    )

    // eliminar cookie
    res.cookies.delete('gsm_token')

    return res
  }

  //  No autenticado
  if (isProtected && (!token || isExpired)) {
    return NextResponse.redirect(
      new URL(`/${locale}/login`, req.url)
    )
  }

  //  Ya autenticado
  if (isPublic && token && !isExpired) {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard`, req.url)
    )
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}