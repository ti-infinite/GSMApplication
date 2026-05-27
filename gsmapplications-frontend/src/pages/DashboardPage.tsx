import { useEffect } from 'react'
import { useParams, useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QuickCards from '@/features/dashboard/QuickCards'
import DashboardActivity from '@/features/dashboard/DashboardActivity'
import type { DashboardOutletCtx } from '@/shared/lib/menu'

export default function DashboardPage() {
  const { locale = 'en' } = useParams<{ locale: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { shortcuts } = useOutletContext<DashboardOutletCtx>()

  useEffect(() => {
    if (shortcuts.length === 1 && location.state?.fromLogin) {
      const route = shortcuts[0].Route || shortcuts[0].Children?.[0]?.Route
      if (route) navigate(`/${locale}${route}`, { replace: true })
    }
  }, [shortcuts, locale, navigate, location.state])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>
      <QuickCards items={shortcuts} locale={locale} />
      <DashboardActivity locale={locale} />
    </>
  )
}