import { useEffect } from 'react'
import { useParams, useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Cookies from 'js-cookie'
import { getCompanyIdFromToken } from '@/lib/theme'
import QuickCards from '@/dashboard/QuickCards'
import DashboardActivity from '@/dashboard/DashboardActivity'
import type { MenuOption } from '@/dashboard/Sidebar'

type OutletCtx = { shortcuts: MenuOption[] }

function getTenantKey(companyId: string): string {
  return companyId.toUpperCase().startsWith('AG') ? 'ag' : 'ih'
}

export default function DashboardPage() {
  const { locale = 'en' } = useParams<{ locale: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { shortcuts } = useOutletContext<OutletCtx>()

  useEffect(() => {
    if (shortcuts.length === 1 && location.state?.fromLogin) {
      const route = shortcuts[0].Route || shortcuts[0].Children?.[0]?.Route
      if (route) navigate(`/${locale}${route}`, { replace: true })
    }
  }, [shortcuts, locale, navigate, location.state])

  const token     = Cookies.get('gsm_token') ?? ''
  const tenantKey = getTenantKey(getCompanyIdFromToken(token) ?? '')

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>
      <QuickCards items={shortcuts} locale={locale} />
      <DashboardActivity tenant={tenantKey} locale={locale} />
    </>
  )
}