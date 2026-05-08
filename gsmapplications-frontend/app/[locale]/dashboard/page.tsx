import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getCompanyIdFromToken } from '@/app/lib/theme'
import QuickCards from './QuickCards'
import DashboardActivity from './DashboardActivity'

function getTenantKey(companyId: string): string {
  return companyId.toUpperCase().startsWith('AG') ? 'ag' : 'ih'
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard' })

  const cookieStore = await cookies()
  const token      = cookieStore.get('gsm_token')?.value ?? ''
  const tenantKey  = getTenantKey(getCompanyIdFromToken(token) ?? '')

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <QuickCards tenant={tenantKey} locale={locale} />
      <DashboardActivity tenant={tenantKey} locale={locale} />
    </>
  )
}