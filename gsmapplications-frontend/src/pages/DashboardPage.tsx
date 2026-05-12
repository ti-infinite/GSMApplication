import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Cookies from 'js-cookie'
import { getCompanyIdFromToken } from '@/lib/theme'
import QuickCards from '@/dashboard/QuickCards'
import DashboardActivity from '@/dashboard/DashboardActivity'

function getTenantKey(companyId: string): string {
  return companyId.toUpperCase().startsWith('AG') ? 'ag' : 'ih'
}

export default function DashboardPage() {
  const { locale = 'en' } = useParams<{ locale: string }>()
  const { t } = useTranslation()

  const token     = Cookies.get('gsm_token') ?? ''
  const tenantKey = getTenantKey(getCompanyIdFromToken(token) ?? '')

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>
      <QuickCards tenant={tenantKey} locale={locale} />
      <DashboardActivity tenant={tenantKey} locale={locale} />
    </>
  )
}
