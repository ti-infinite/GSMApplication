import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { fetchTenantTheme, getCompanyIdFromToken } from '@/app/lib/theme'
import { type MenuOption } from './Sidebar'
import DashboardShell from './DashboardShell'
import type { Locale } from '@/i18n/routing'

if (!process.env.GATEWAY_URL) throw new Error('[GSM] GATEWAY_URL environment variable is not configured')
const GATEWAY = process.env.GATEWAY_URL

type MenuResponseDto = {
  success: boolean
  menu: string
}

function normalizeItems(items: (MenuOption & { Name?: string; IdObject?: string })[]): MenuOption[] {
  return items.map(item => ({
    Description: item.Description || item.Name || '',
    IdObject:    item.IdObject,
    Icon:        item.Icon    || undefined,
    Route:       item.Route   || undefined,
    Section:     item.Section ?? 'menu',
    IsNew:       item.IsNew   ?? false,
    Children:    item.Children ? normalizeItems(item.Children) : undefined,
  }))
}

function parseMenu(raw: string): MenuOption[] {
  try {
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed) ? parsed
      : (parsed?.MenuOptions ?? parsed?.menuOptions ?? parsed?.Options ?? [])
    return normalizeItems(items)
  } catch (e) {
    console.warn('[GSM] Failed to parse menu JSON:', e)
    return []
  }
}

function translateItems(items: MenuOption[], t: (key: string) => string): MenuOption[] {
  return items.map(item => ({
    ...item,
    Description: item.IdObject
      ? (() => { try { return t(item.IdObject!) } catch { return item.Description } })()
      : item.Description,
    Children: item.Children ? translateItems(item.Children, t) : undefined,
  }))
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const cookieStore = await cookies()
  const token    = cookieStore.get('gsm_token')?.value
  const userName = cookieStore.get('gsm_user_name')?.value ?? ''

  if (!token) redirect(`/${locale}/login`)

  const companyId = getCompanyIdFromToken(token!) ?? ''
  const t = await getTranslations({ locale, namespace: 'menu' })

  try {
    const [menuRes, theme] = await Promise.all([
      fetch(`${GATEWAY}/api/application/v1/Application/getMenu`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      fetchTenantTheme(companyId),
    ])

    if (menuRes.status === 401) redirect(`/${locale}/login`)
    if (!menuRes.ok) throw new Error(`Menu fetch failed: ${menuRes.status}`)

    const data = await menuRes.json() as MenuResponseDto
    const menuItems = translateItems(parseMenu(data?.menu ?? ''), t)

    const brand = {
      name:     theme?.meta.name     ?? '',
      initials: theme?.meta.initials ?? '',
      logo:     theme?.meta.logo,
    }

    return (
      <DashboardShell items={menuItems} brand={brand} locale={locale as Locale} userName={userName}>
        {children}
      </DashboardShell>
    )
  } catch {
    redirect(`/${locale}/login`)
  }
}