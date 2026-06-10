import { useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { isSessionActive, isPasswordChangeRequired } from '@/shared/lib/auth'

export default function AuthGuard() {
  const { locale } = useParams<{ locale: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSessionActive()) {
      navigate(`/${locale}/login`, { replace: true })
      return
    }
    if (isPasswordChangeRequired()) {
      navigate(`/${locale}/change-password`, { replace: true })
    }
  }, [locale, navigate])

  if (!isSessionActive()) return null
  if (isPasswordChangeRequired()) return null

  return <Outlet />
}
