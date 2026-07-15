import Cookies from 'js-cookie'
import { errorTypeToKey } from '@/shared/lib/errorType'
import { ErrorType, type AuthenticatedUserDto } from '@/shared/api/auth/model'

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
  errorType?: string | null
  data:       LoginDataDto
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const { companyId, user, password } = credentials
  let response: LoginResponseDto

  try {
    const res = await fetch('/api/security/v1/Auth/login', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ IDCompany: companyId, User: user, Password: password }),
    })
    response = await res.json()
  } catch {
    return { success: false, error: 'errors.serverConnection' }
  }

  if (!response.success) {
    const errorType = response.errorType ?? undefined
    // Unauthorized and NotFound both map to invalid credentials to prevent user enumeration
    const isCredentialError = errorType === ErrorType.Unauthorized || errorType === ErrorType.NotFound
    return { success: false, error: isCredentialError ? 'errors.unauthorized' : errorTypeToKey(errorType) }
  }

  const expiresAt   = response.data?.expiresAtUtc
  const displayName = response.data?.user?.fullName || response.data?.user?.username

  if (!expiresAt) {
    console.error('[auth] Unexpected login response shape:', response)
    return { success: false, error: 'errors.serverConnection' }
  }

  const expires = new Date(expiresAt)
  // Store only the expiry timestamp so AuthGuard can check session without reading the token
  const expUnix = Math.floor(expires.getTime() / 1000).toString()

  // Session cookies (no `expires`) → the browser clears them on close, so closing
  // the browser logs the user out. Within a session, isSessionActive() still gates
  // on the token-expiry timestamp held as the cookie value (logout also on expiry).
  Cookies.set('gsm_exp',       expUnix,          { sameSite: 'strict', path: '/' })
  Cookies.set('gsm_user_name', displayName ?? '', { sameSite: 'strict', path: '/' })
  Cookies.set('gsm_company',   companyId,         { sameSite: 'strict', path: '/' })

  if (response.data?.user) {
    // sessionStorage → auto-cleared on browser close, consistent with the session
    // cookies above. No user PII lingers after closing the browser and it doesn't
    // depend on an explicit logout. (Lifetime matches the cookies → no desync.)
    sessionStorage.setItem('gsm_user', JSON.stringify(response.data.user))
  }

  if (response.data?.user?.passwordChangeRequired) {
    Cookies.set('gsm_pwd_change', '1', { sameSite: 'strict', path: '/' })
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
  errorType?: string | null
}


export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const idUser = getStoredUser()?.idUser
  if (!idUser) return { success: false, error: 'errors.serverConnection' }

  let response: ChangePasswordResponseDto

  try {
    const res = await fetch(`/api/application/v1/users/${idUser}/password`, {
      method:      'PUT',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
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

export function isSessionActive(): boolean {
  const exp = Cookies.get('gsm_exp')
  if (!exp) return false
  return parseInt(exp, 10) > Math.floor(Date.now() / 1000)
}

export function getStoredUser(): AuthenticatedUserDto | null {
  try {
    const raw = sessionStorage.getItem('gsm_user')
    return raw ? (JSON.parse(raw) as AuthenticatedUserDto) : null
  } catch {
    return null
  }
}

export function logout(): void {
  Cookies.remove('gsm_exp')
  Cookies.remove('gsm_user_name')
  Cookies.remove('gsm_company')
  Cookies.remove('gsm_pwd_change')
  sessionStorage.clear()
  // Fire-and-forget: tells the server to clear the httpOnly gsm_token cookie
  fetch('/api/security/v1/Auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
}