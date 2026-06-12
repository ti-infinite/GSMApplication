import { Skeleton } from '@/shared/ui/skeleton'
import DashboardLoading from './DashboardLoading'

/**
 * Full-shell skeleton shown while the menu/branding load. Mirrors the real
 * layout (sidebar + header + content) entirely in skeleton — no real elements
 * (sign out, brand colors, user) appear until everything is ready, so the load
 * never looks "in parts".
 */
export default function DashboardSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — desktop only, like the real one (mobile sidebar is an overlay) */}
      <aside className="hidden w-55 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-col gap-1 px-3 pt-1">
          <Skeleton className="mb-1.5 ml-3 h-2.5 w-12" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-5">
          <Skeleton className="h-5 w-5 rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          <DashboardLoading />
        </main>
      </div>
    </div>
  )
}