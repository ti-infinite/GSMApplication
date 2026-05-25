import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import ComingSoon from '@/components/ComingSoon'

const modules: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'resources': lazy(() => import('@/modules/resources/ResourcesPage')),
  'sop':   lazy(() => import('@/modules/sop/SopPage')),
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
  const Component = modules[slug]

  if (!Component) return <ComingSoon title={slugToTitle(slug)} />

  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <Component />
    </Suspense>
  )
}