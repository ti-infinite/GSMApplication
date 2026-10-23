import { Skeleton } from '@/shared/ui/skeleton'

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
} 