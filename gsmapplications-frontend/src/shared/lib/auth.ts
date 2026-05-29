import Cookies from 'js-cookie'
import { errorTypeToKey } from '@/shared/lib/errorType'
import type { AuthenticatedUserDto } from '@/shared/api/auth/model'

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
  user?:        AuthenticatedUserDto
}

type LoginResponseDto = {
  success:    boolean
  message:    string
  errorType?: number | null
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
    const errorType = response.errorType ?? undefined
    // Login failures (user not found or wrong password) always map to invalid credentials
    // regardless of errorType to prevent user enumeration
    const isCredentialError = errorType === 1 || errorType === 2
    return { success: false, error: isCredentialError ? 'errors.unauthorized' : errorTypeToKey(errorType) }
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

  if (response.data?.user) {
    sessionStorage.setItem('gsm_user', JSON.stringify(response.data.user))
  }

  if (response.data?.user?.passwordChangeRequired) {
    Cookies.set('gsm_pwd_change', '1', { expires, sameSite: 'lax', path: '/' })
  } else {
    Cookies.remove('gsm_pwd_change')
  }

  return { success: true }
}

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: string }

type ChangePasswordResponseDto = {
  success:    boolean
  message:    string
  errorType?: number | null
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const token = getToken()
  let response: ChangePasswordResponseDto

  try {
    const res = await fetch('/api/security/v1/Auth/changePassword', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify({ CurrentPassword: currentPassword, NewPassword: newPassword }),
    })
    response = await res.json()
  } catch {
    return { success: false, error: 'errors.serverConnection' }
  }

  if (!response.success) {
    return { success: false, error: errorTypeToKey(response.errorType ?? undefined) }
  }

  Cookies.remove('gsm_pwd_change')
  return { success: true }
}

export function isPasswordChangeRequired(): boolean {
  return Cookies.get('gsm_pwd_change') === '1'
}

export function getToken(): string {
  return Cookies.get('gsm_token') ?? ''
}

export function getStoredUser(): AuthenticatedUserDto | null {
  try {
    const raw = sessionStorage.getItem('gsm_user')
    return raw ? (JSON.parse(raw) as AuthenticatedUserDto) : null
  } catch {
    return null
  }
}

export function logout() {
  Cookies.remove('gsm_token')
  Cookies.remove('gsm_user_name')
  Cookies.remove('gsm_company')
  sessionStorage.removeItem('gsm_user')
}

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