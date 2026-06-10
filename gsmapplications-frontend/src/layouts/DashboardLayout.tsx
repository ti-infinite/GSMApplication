import { useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { useQueryClient } from '@tanstack/react-query'
import { useTenant } from '@/app/providers/TenantProvider'
import { useMenu } from '@/shared/hooks/useMenu'
import { logout } from '@/shared/lib/auth'
import DashboardShell from '@/layouts/shell/DashboardShell'
import DashboardLoading from '@/shared/components/DashboardLoading'
import type { DashboardOutletCtx } from '@/shared/lib/menu'

export default function DashboardLayout() {
  const { locale } = useParams<{ locale: string }>()
  const navigate   = useNavigate()
  const { branding } = useTenant()

  const userName     = Cookies.get('gsm_user_name') ?? ''
  const queryClient  = useQueryClient()

  const { menuItems, shortcuts, allOptions, loading, isError } = useMenu()

  useEffect(() => {
    if (isError) navigate(`/${locale}/login`, { replace: true })
  }, [isError, navigate, locale])

  function handleLogout() {
    logout()
    queryClient.clear()
    navigate(`/${locale}/login`, { replace: true })
  }

  const brand = {
    name:     branding.name,
    initials: branding.initials,
    logo:     branding.logo,
  }

  // While the menu loads, show the real shell (navbar + sidebar) with the
  // content area in skeleton, so there is no jump from a centered loader
  // to the full app.
  if (loading) {
    return (
      <DashboardShell
        items={[]}
        brand={brand}
        locale={locale ?? 'en'}
        userName={userName}
        loading
        onLogout={handleLogout}
      >
        <DashboardLoading />
      </DashboardShell>
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
      <Outlet context={{ shortcuts, menuOptions: allOptions } satisfies DashboardOutletCtx} />
    </DashboardShell>
  )
}