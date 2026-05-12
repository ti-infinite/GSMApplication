export type TenantTheme = {
  light: Record<string, string>
  dark: Record<string, string>
  meta: {
    name: string
    initials: string
    defaultLocale: string
    logo?: string
    tagline: Record<string, string>
  }
}

export async function fetchTenantTheme(companyId: string): Promise<TenantTheme | null> {
  try {
    const res = await fetch('/api/security/v1/tenant/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany: companyId }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.tenantExists || !data.jsonStyles) return null
    return JSON.parse(data.jsonStyles) as TenantTheme
  } catch {
    return null
  }
}

export function buildThemeCSS(theme: TenantTheme, tenantSlug: string): string {
  const sel = `html[data-tenant="${tenantSlug}"]`
  const sanitizeValue = (v: string) => v.replace(/<\/style/gi, '')
  const toVars = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${sanitizeValue(v)};`)
      .join('\n')
  return `${sel} {\n${toVars(theme.light)}\n}\n${sel}.dark {\n${toVars(theme.dark)}\n}`
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

export function getCompanyIdFromToken(token: string): string | null {
  const payload = decodeTokenPayload(token)
  return (payload?.companyId as string) ?? null
}

export function getUserNameFromToken(token: string): string {
  const payload = decodeTokenPayload(token)
  if (!payload) return ''
  return (
    (payload.fullName as string) ??
    (payload.name as string) ??
    (payload.unique_name as string) ??
    (payload.sub as string) ??
    ''
  )
}

export function isTokenValid(token: string): boolean {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

const THEME_CACHE_KEY = 'gsm_theme_vars'

export function cacheThemeVars(vars: Record<string, string>) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(vars))
  } catch { /* ignore */ }
}

export function applyThemeVarsFromCache() {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY)
    if (!cached) return
    const vars = JSON.parse(cached) as Record<string, string>
    Object.entries(vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    )
  } catch { /* ignore */ }
}
