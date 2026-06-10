import { lazy, Suspense } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ComingSoon from '@/shared/components/ComingSoon'
import NotFound from '@/shared/components/NotFound'
import ExternalPage from '@/shared/components/ExternalPage'
import type { DashboardOutletCtx } from '@/shared/lib/menu'

const modules: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'resources': lazy(() => import('@/features/resources/ResourcesPage')),
  'sop':       lazy(() => import('@/features/sop/SopPage')),
  'settings':  lazy(() => import('@/features/settings/SettingsPage')),
  'productivity': lazy(() => import('@/features/productivity/ProductivityPage')),
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
  const { t } = useTranslation()

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
  if (Component) {
    return (
      <Suspense fallback={<div className="p-8 text-muted-foreground">{t('common.loading')}</div>}>
        <Component />
      </Suspense>
    )
  }

  // The route maps to a real menu option but has no implementation yet → ComingSoon.
  // The route matches nothing in the menu → genuine 404.
  return option ? <ComingSoon title={slugToTitle(slug)} /> : <NotFound />
}