import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/providers/TenantProvider'
import DashboardShell from '@/dashboard/DashboardShell'
import DashboardLoading from '@/components/DashboardLoading'
import type { MenuOption } from '@/dashboard/Sidebar'

type MenuResponseDto = { success: boolean; menu: string }

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
  } catch {
    return []
  }
}

export default function DashboardLayout() {
  const { locale } = useParams<{ locale: string }>()
  const navigate   = useNavigate()
  const { t }      = useTranslation()
  const { branding } = useTenant()

  const [menuItems, setMenuItems] = useState<MenuOption[]>([])
  const [loading,   setLoading]   = useState(true)

  const token    = Cookies.get('gsm_token') ?? ''
  const userName = Cookies.get('gsm_user_name') ?? ''

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/application/v1/Application/getMenu', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          navigate(`/${locale}/login`, { replace: true })
          return
        }
        if (!res.ok) throw new Error(`Menu fetch failed: ${res.status}`)
        const data = await res.json() as MenuResponseDto
        const items = parseMenu(data?.menu ?? '')
        const translated = items.map(item => ({
          ...item,
          Description: item.IdObject
            ? t(`menu.${item.IdObject}`, { defaultValue: item.Description })
            : item.Description,
          Children: item.Children?.map(child => ({
            ...child,
            Description: child.IdObject
              ? t(`menu.${child.IdObject}`, { defaultValue: child.Description })
              : child.Description,
          })),
        }))
        setMenuItems(translated)
      } catch {
        navigate(`/${locale}/login`, { replace: true })
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [token, locale, navigate, t])

  const brand = {
    name:     branding.name,
    initials: branding.initials,
    logo:     branding.logo,
  }

  function handleLogout() {
    Cookies.remove('gsm_token')
    Cookies.remove('gsm_user_name')
    navigate(`/${locale}/login`, { replace: true })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-4xl">
          <DashboardLoading />
        </div>
      </div>
    )
  }

  return (
    <DashboardShell
      items={menuItems}
      brand={brand}
      locale={locale ?? 'en'}
      userName={userName}
      onLogout={handleLogout}
    >
      <Outlet />
    </DashboardShell>
  )
}
