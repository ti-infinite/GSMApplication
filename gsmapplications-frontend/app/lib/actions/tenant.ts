'use server'
import { cookies } from 'next/headers'
import type { TenantTheme } from '@/app/lib/theme'

if (!process.env.GATEWAY_URL) throw new Error('[GSM] GATEWAY_URL environment variable is not configured')
const GATEWAY = process.env.GATEWAY_URL

export async function persistCompany(companyId: string) {
  const cookieStore = await cookies()
  cookieStore.set('gsm_company', companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
  })
}

export type ResolveResult =
  | { valid: false }
  | {
      valid: true
      name: string
      initials: string
      defaultLocale: string
      logo?: string
      tagline: Record<string, string>
      lightVars: Record<string, string>
    }

export async function resolveCompany(companyId: string): Promise<ResolveResult> {
  try {
    const res = await fetch(`${GATEWAY}/api/security/v1/tenant/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany: companyId }),
      cache: 'no-store',
    })
    if (!res.ok) return { valid: false }
    const data = await res.json()
    if (!data.tenantExists || !data.jsonStyles) return { valid: false }
    const theme = JSON.parse(data.jsonStyles) as TenantTheme
    return {
      valid: true,
      name: theme.meta.name,
      initials: theme.meta.initials,
      defaultLocale: theme.meta.defaultLocale,
      logo: theme.meta.logo,
      tagline: theme.meta.tagline,
      lightVars: theme.light,
    }
  } catch {
    return { valid: false }
  }
}
