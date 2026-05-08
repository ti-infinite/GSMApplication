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

if (!process.env.GATEWAY_URL) throw new Error('[GSM] GATEWAY_URL environment variable is not configured')
const GATEWAY = process.env.GATEWAY_URL

export async function fetchTenantTheme(companyId: string): Promise<TenantTheme | null> {
  try {
    const res = await fetch(`${GATEWAY}/api/security/v1/tenant/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany: companyId }),
      cache: 'no-store',
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
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
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
