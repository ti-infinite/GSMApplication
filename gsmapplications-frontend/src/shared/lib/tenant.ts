import Cookies from 'js-cookie'
import type { TenantTheme } from './theme'

export function persistCompany(companyId: string) {
  Cookies.set('gsm_company', companyId, { sameSite: 'lax', path: '/', expires: 1 })
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
    const res = await fetch('/api/security/v1/tenant/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany: companyId }),
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