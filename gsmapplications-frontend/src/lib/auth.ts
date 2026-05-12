import Cookies from 'js-cookie'

export type LoginResult =
  | { success: true }
  | { success: false; error: string }

export async function login(
  idCompany: string,
  user: string,
  password: string,
): Promise<LoginResult> {
  let data: {
    success: boolean
    message: string
    token: string
    expiresAtUtc: string
    user?: { fullName: string; username: string }
  }

  try {
    const res = await fetch('/api/security/v1/Auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany: idCompany, User: user, Password: password }),
    })
    if (!res.ok) return { success: false, error: 'Error de conexión con el servidor' }
    data = await res.json()
  } catch (e) {
    return { success: false, error: `Error de conexión: ${e instanceof Error ? e.message : String(e)}` }
  }

  if (!data.success) {
    return { success: false, error: data.message || 'Credenciales inválidas' }
  }

  const expires = new Date(data.expiresAtUtc)
  Cookies.set('gsm_token', data.token, { expires, sameSite: 'lax', path: '/' })
  Cookies.set('gsm_user_name', data.user?.fullName ?? data.user?.username ?? '', {
    expires,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true }
}

export function logout() {
  Cookies.remove('gsm_token')
  Cookies.remove('gsm_user_name')
}

export function isTokenExpired(token: string): boolean {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return payload.exp < Math.floor(Date.now() / 1000)
  } catch {
    return true
  }
}
