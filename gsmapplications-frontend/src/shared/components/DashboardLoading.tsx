import { Skeleton } from '@/shared/ui/skeleton'

// Mirrors the real DashboardPage layout (header + QuickCards grid +
// DashboardActivity two-column) so the skeleton previews the actual
// structure and the hand-off to real content has no jump.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* QuickCards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* DashboardActivity (activity + news) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}