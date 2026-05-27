import { useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { useTenant } from '@/app/providers/TenantProvider'
import { useMenu } from '@/shared/hooks/useMenu'
import DashboardShell from '@/layouts/shell/DashboardShell'
import DashboardLoading from '@/shared/components/DashboardLoading'
import type { DashboardOutletCtx } from '@/shared/lib/menu'

export default function DashboardLayout() {
  const { locale } = useParams<{ locale: string }>()
  const navigate   = useNavigate()
  const { branding } = useTenant()

  const userName = Cookies.get('gsm_user_name') ?? ''

  const { menuItems, shortcuts, allOptions, loading, isError } = useMenu()

  useEffect(() => {
    if (isError) navigate(`/${locale}/login`, { replace: true })
  }, [isError, navigate, locale])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-4xl">
          <DashboardLoading />
        </div>
      </div>
    )
  }

  function handleLogout() {
    Cookies.remove('gsm_token')
    Cookies.remove('gsm_user_name')
    navigate(`/${locale}/login`, { replace: true })
  }

  const brand = {
    name:     branding.name,
    initials: branding.initials,
    logo:     branding.logo,
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