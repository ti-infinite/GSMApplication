import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { fetchTenantTheme, buildThemeCSS, getCompanyIdFromToken } from '@/app/lib/theme'
import { getBrandingFromCompanyId, TENANT_IDS } from '@/app/lib/tenants'
import { TenantProvider } from '@/app/providers/TenantProvider'
import '../globals.css'

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GSM Application',
  description: 'GSM Application Portal',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'en' | 'es')) {
    notFound()
  }

  const cookieStore = await cookies()
  const token      = cookieStore.get('gsm_token')?.value
  const gsmCompany = cookieStore.get('gsm_company')?.value

  // Priority: JWT (authenticated) > last selected company > locale default
  const companyId = (token && isTokenValid(token) ? getCompanyIdFromToken(token) : null)
    ?? gsmCompany
    ?? TENANT_IDS[locale]
    ?? ''

  const tenantSlug = companyId.toLowerCase().replace(/[^a-z0-9]/g, '-')

  const [messages, theme] = await Promise.all([
    getMessages(),
    fetchTenantTheme(companyId),
  ])

  const themeCSS       = theme ? buildThemeCSS(theme, tenantSlug) : null
  const initialBranding = theme
    ? { name: theme.meta.name, initials: theme.meta.initials, logo: theme.meta.logo, tagline: theme.meta.tagline }
    : getBrandingFromCompanyId(companyId)

  return (
    <html
      lang={locale}
      data-tenant={tenantSlug}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        <NextIntlClientProvider messages={messages}>
          <TenantProvider initialCompanyId={companyId} initialBranding={initialBranding}>
            {children}
          </TenantProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}