import { lazy, Suspense } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import ComingSoon from '@/shared/components/ComingSoon'
import ExternalPage from '@/shared/components/ExternalPage'
import type { DashboardOutletCtx } from '@/shared/lib/menu'

const modules: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'resources': lazy(() => import('@/features/resources/ResourcesPage')),
  'sop':       lazy(() => import('@/features/sop/SopPage')),
  'settings':  lazy(() => import('@/features/settings/SettingsPage')),
}

function slugToTitle(slug: string): string {
  return slug
    .split('/')
    .filter(Boolean)
    .map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    .join(' — ')
}

export default function ModulePage() {
  const { '*': slug = '' } = useParams()
  const { menuOptions } = useOutletContext<DashboardOutletCtx>()

  const option = menuOptions.find(o => o.Route?.endsWith(`/${slug}`))

  if (option?.ExternalRoute) {
    return (
      <ExternalPage
        url={option.ExternalRoute}
        activeType={option.ActiveType}
        title={option.Description}
      />
    )
  }

  const Component = modules[slug]
  if (!Component) return <ComingSoon title={slugToTitle(slug)} />

  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <Component />
    </Suspense>
  )
}