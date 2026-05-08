'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

if (!process.env.GATEWAY_URL) throw new Error('[GSM] GATEWAY_URL environment variable is not configured')
const GATEWAY = process.env.GATEWAY_URL

export type LoginState = { error: string } | undefined

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const IDCompany = formData.get('idCompany') as string
  const User = formData.get('user') as string
  const Password = formData.get('password') as string
  const locale = (formData.get('locale') as string) || 'en'
  let data: {
    success: boolean
    message: string
    token: string
    expiresAtUtc: string
    user?: { fullName: string; username: string }
  }

  try {
    const res = await fetch(`${GATEWAY}/api/security/v1/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDCompany, User, Password }),
    })
    if (!res.ok) return { error: 'Error de conexión con el servidor' }
    data = await res.json()
  } catch (e) {
    return { error: `Error de conexión: ${e instanceof Error ? e.message : String(e)}` }
  }

  if (!data.success) {
    return { error: data.message || 'Credenciales inválidas' }
  }

  const expiresAt = new Date(data.expiresAtUtc)
  const cookieStore = await cookies()
  cookieStore.set('gsm_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
  cookieStore.set('gsm_user_name', data.user?.fullName ?? data.user?.username ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })

  redirect(`/${locale}/dashboard`)
}

export async function logout(formData: FormData) {
  const locale = (formData.get('locale') as string) || 'en'
  const cookieStore = await cookies()
  cookieStore.delete('gsm_token')
  cookieStore.delete('gsm_user_name')
  redirect(`/${locale}/login`)
}
