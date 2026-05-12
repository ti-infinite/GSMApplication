import { useEffect } from 'react'
import { Outlet, useParams, Navigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import i18n from '@/i18n'
import { TenantProvider } from '@/providers/TenantProvider'
import { applyThemeVarsFromCache, isTokenValid, getCompanyIdFromToken } from '@/lib/theme'
import { TENANT_IDS, getBrandingFromCompanyId } from '@/lib/tenants'

const SUPPORTED_LOCALES = ['en', 'es']

export default function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>()

  useEffect(() => {
    applyThemeVarsFromCache()
  }, [])

  // Sincroniza i18n cuando el usuario cambia de locale via URL
  useEffect(() => {
    if (locale && SUPPORTED_LOCALES.includes(locale) && i18n.language !== locale) {
      i18n.changeLanguage(locale)
    }
  }, [locale])

  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
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
