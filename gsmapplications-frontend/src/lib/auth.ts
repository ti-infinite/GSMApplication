import Cookies from 'js-cookie'

export type LoginCredentials = {
  companyId: string
  user: string
  password: string
}

export type LoginResult =
  | { success: true }
  | { success: false; error: string }

type LoginDataDto = {
  token:        string
  expiresAtUtc: string
  user?: {
    idUser:                 string
    username:               string
    fullName:               string
    email:                  string
    idProfile:              number
    passwordChangeRequired: boolean
    location:               string
    department:             string
  }
}

type LoginResponseDto = {
  success:    boolean
  message:    string
  errorType?: string | null
  data:       LoginDataDto
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const { companyId, user, password } = credentials
  let response: LoginResponseDto

  try {
    const res = await fetch('/api/security/v1/Auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany: companyId, User: user, Password: password }),
    })
    response = await res.json()
  } catch {
    return { success: false, error: 'errors.serverConnection' }
  }

  if (!response.success) {
    return { success: false, error: response.message || 'errors.loginFailed' }
  }

  const token       = response.data?.token
  const expiresAt   = response.data?.expiresAtUtc
  const displayName = response.data?.user?.fullName || response.data?.user?.username

  if (!token || !expiresAt) {
    console.error('[auth] Unexpected login response shape:', response)
    return { success: false, error: 'errors.serverConnection' }
  }

  const expires = new Date(expiresAt)
  Cookies.set('gsm_token', token, { expires, sameSite: 'lax', path: '/' })
  Cookies.set('gsm_user_name', displayName ?? '', { expires, sameSite: 'lax', path: '/' })

  return { success: true }
}

export function logout() {
  Cookies.remove('gsm_token')
  Cookies.remove('gsm_user_name')
  Cookies.remove('gsm_company')
}

// JWT utilities — single source of truth for token inspection

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

export function isTokenValid(token: string): boolean {
  const payload = decodeTokenPayload(token)
  return typeof payload?.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)
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