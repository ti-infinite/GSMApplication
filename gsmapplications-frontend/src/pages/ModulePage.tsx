import { lazy, Suspense } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { Skeleton } from '@/shared/ui/skeleton'
import ComingSoon from '@/shared/components/ComingSoon'
import NotFound from '@/shared/components/NotFound'
import ExternalPage from '@/shared/components/ExternalPage'
import type { DashboardOutletCtx } from '@/shared/lib/menu'

const modules: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'resources': lazy(() => import('@/pages/resources/ResourcesPage')),
  'sop':       lazy(() => import('@/pages/sop/SopPage')),
  'settings':  lazy(() => import('@/pages/settings/SettingsPage')),
  'productivity': lazy(() => import('@/pages/productivity/ProductivityPage')),
  'operations/products': lazy(() => import('@/pages/products/ProductsPage')),
  'operations/requirements': lazy(() => import('@/pages/requirements/RequirementsPage')),
  'operations/purchase-order': lazy(() => import('@/pages/purchase-orders/PurchaseOrdersPage')),
  'operations/reception': lazy(() => import('@/pages/reception/ReceptionPage')),
  'operations/invoice': lazy(() => import('@/pages/invoice/InvoicePage')),
  'artificial-intelligence/order/orders':    lazy(() => import('@/pages/ia/orders/OrdersPage')),
  'artificial-intelligence/order/chat':      lazy(() => import('@/pages/ia/orders/ChatPage')),
  'artificial-intelligence/order/documents': lazy(() => import('@/pages/ia/orders/DocumentsPage')),
  'artificial-intelligence/order/ih-sales':  lazy(() => import('@/pages/ia/orders/IHSalesPage')),
  'artificial-intelligence/order/metrics':   lazy(() => import('@/pages/ia/orders/MetricsPage')),
  'artificial-intelligence/order/upload':    lazy(() => import('@/pages/ia/orders/UploadPage')),
  'artificial-intelligence/purchase/chat':   lazy(() => import('@/features/ia/purchases/ChatPage')),
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
  if (Component) {
    return (
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        }
      >
        <Component />
      </Suspense>
    )
  }

  // The route maps to a real menu option but has no implementation yet → ComingSoon.
  // The route matches nothing in the menu → genuine 404.
  return option ? <ComingSoon title={slugToTitle(slug)} /> : <NotFound />
}