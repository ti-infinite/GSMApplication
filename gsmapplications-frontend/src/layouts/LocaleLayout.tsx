import { useEffect } from 'react'
import { Outlet, useParams, Navigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import i18n from '@/app/i18n'
import { TenantProvider } from '@/app/providers/TenantProvider'
import { isTokenValid, getCompanyIdFromToken } from '@/shared/lib/auth'
import { DEFAULT_TENANT_ID, getBrandingFromCompanyId } from '@/shared/lib/tenants'
import { isSupportedLocale } from '@/shared/hooks/useLocale'

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
    ?? DEFAULT_TENANT_ID
    ?? ''

  const initialBranding = getBrandingFromCompanyId(companyId)

  return (
    <TenantProvider initialCompanyId={companyId} initialBranding={initialBranding}>
      <Outlet />
    </TenantProvider>
  )
}