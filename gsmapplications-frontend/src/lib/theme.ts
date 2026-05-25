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

// CSS var names must start with -- and contain only word chars, hyphens, digits
const CSS_VAR_NAME_RE = /^--[\w-]+$/
// Block injection vectors: url(), expression(), semicolons (breakout), braces, < (HTML close tags)
const CSS_VALUE_UNSAFE_RE = /url\s*\(|expression\s*\(|[;<>{}\\]/i

function sanitizeCssValue(v: string): string | null {
  if (typeof v !== 'string') return null
  if (CSS_VALUE_UNSAFE_RE.test(v)) return null
  return v.trim()
}

export function buildThemeCSS(theme: TenantTheme, tenantSlug: string): string {
  // Sanitize tenantSlug to prevent attribute injection
  const slug = tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '')
  const sel = `html[data-tenant="${slug}"]`
  const toVars = (vars: Record<string, string>) =>
    Object.entries(vars)
      .filter(([k]) => CSS_VAR_NAME_RE.test(k))
      .map(([k, v]) => {
        const safe = sanitizeCssValue(v)
        return safe !== null ? `  ${k}: ${safe};` : null
      })
      .filter(Boolean)
      .join('\n')
  return `${sel} {\n${toVars(theme.light)}\n}\n${sel}.dark {\n${toVars(theme.dark)}\n}`
}

export { isTokenValid, getCompanyIdFromToken, getUserNameFromToken } from '@/lib/auth'

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
