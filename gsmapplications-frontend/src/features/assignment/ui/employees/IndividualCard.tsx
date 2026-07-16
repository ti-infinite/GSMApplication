import { X } from 'lucide-react'
import { Avatar } from '@/shared/ui/avatar'
import { MesaControls } from './MesaControls'
import type { EmployeeGroup, ConfiguredProduct } from '../../model/types'

// Individual mode: each employee is its OWN mesa (one TRX), with its own product + qty.
export function IndividualCard({ group, colorIdx, products, onRemove, onProduct, onQty }: {
  group:     EmployeeGroup
  colorIdx:  number
  products:  ConfiguredProduct[]
  onRemove:  () => void
  onProduct: (groupId: string, productId: string) => void
  onQty:     (groupId: string, qty: number) => void
}) {
  const emp = group.employees[0]
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2">
        <Avatar name={emp?.name ?? group.name} colorIndex={colorIdx} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{emp?.name ?? group.name}</p>
          <p className="truncate text-xs text-muted-foreground">{emp?.role}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive">
          <X className="h-3 w-3" />
        </button>
      </div>
      <MesaControls group={group} products={products} onProduct={onProduct} onQty={onQty} />
    </div>
  )
}
