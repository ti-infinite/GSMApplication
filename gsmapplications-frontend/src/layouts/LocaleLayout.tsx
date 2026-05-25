import { useEffect } from 'react'
import { Outlet, useParams, Navigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import i18n from '@/i18n'
import { TenantProvider } from '@/providers/TenantProvider'
import { isTokenValid, getCompanyIdFromToken } from '@/lib/auth'
import { TENANT_IDS, getBrandingFromCompanyId } from '@/lib/tenants'
import { isSupportedLocale } from '@/hooks/useLocale'

export default function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    if (locale && isSupportedLocale(locale) && i18n.language !== locale) {
      i18n.changeLanguage(locale)
    }
  }, [locale])

  if (!locale || !isSupportedLocale(locale)) {
    return <Navigate to="/en/login" replace />
  }

  const token      = Cookies.get('gsm_token')
  const gsmCompany = Cookies.get('gsm_company')

  const companyId = (token && isTokenValid(token) ? getCompanyIdFromToken(token) : null)
    ?? gsmCompany
    ?? TENANT_IDS[locale]
    ?? ''

  const initialBranding = getBrandingFromCompanyId(companyId)

  return (
    <TenantProvider initialCompanyId={companyId} initialBranding={initialBranding}>
      <Outlet />
    </TenantProvider>
  )
}
