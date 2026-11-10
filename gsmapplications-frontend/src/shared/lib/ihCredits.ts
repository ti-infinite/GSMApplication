import Cookies from 'js-cookie'
import { getStoredUser } from '@/shared/lib/auth'
import { ihFetch, RelayError } from '@/shared/lib/ihAgent'

// ih-credits service (FastAPI on the EC2 box, Caddy `/ih-credits/*`, reached through `/ih-api`).
// Auth: the GSM session cookie `gsm_token` travels with every same-origin request (fetch, <img>,
// <a download>) and the service verifies it with the gateway's JWT secret. The token carries no
// name/e-mail, so we add them as headers for the audit trail (URL-encoded: headers are ASCII-only).
const BASE = '/ih-credits'

export function creditsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Same fallbacks the shell uses for the user chip: some GSM users have no fullName/e-mail
  // stored, only a username (which is sometimes their e-mail).
  const user = getStoredUser()
  const name = user?.fullName || user?.username || Cookies.get('gsm_user_name') || ''
  const email = user?.email || (user?.username?.includes('@') ? user.username : '')
  const identity: Record<string, string> = {}
  if (email) identity['X-User-Email'] = encodeURIComponent(email)
  if (name) identity['X-User-Name'] = encodeURIComponent(name)
  return ihFetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...init.headers, ...identity },
  })
}

/** Parses a JSON response; throws `RelayError(status, detail)` on failure (FastAPI `{detail}`). */
export async function parseCredits<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 204) return undefined as T
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = json?.detail
    throw new RelayError(res.status, typeof detail === 'string' ? detail : fallback)
  }
  return json as T
}

/** Same-origin URL for <img> and <a download> (the cookie authenticates). */
export function creditsUrl(path: string): string {
  return `/ih-api${BASE}${path}`
}

export function creditsQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}
