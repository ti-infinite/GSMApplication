import { useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { isTokenValid } from '@/lib/auth'

export default function AuthGuard() {
  const { locale } = useParams<{ locale: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    const token = Cookies.get('gsm_token')
    if (!token || !isTokenValid(token)) {
      Cookies.remove('gsm_token')
      navigate(`/${locale}/login`, { replace: true })
    }
  }, [locale, navigate])

  const token = Cookies.get('gsm_token')
  if (!token || !isTokenValid(token)) return null

  return <Outlet />
}
