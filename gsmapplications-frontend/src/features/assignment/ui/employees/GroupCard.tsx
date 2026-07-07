import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Avatar } from '@/shared/ui/avatar'
import { MesaControls } from './MesaControls'
import type { EmployeeGroup, ConfiguredProduct } from '../../model/types'

export function GroupCard({ group, products, onRemove, onProduct, onQty }: {
  group:     EmployeeGroup
  products:  ConfiguredProduct[]
  onRemove:  (empId: string) => void
  onProduct: (groupId: string, productId: string) => void
  onQty:     (groupId: string, qty: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{group.name}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {group.employees.length}
        </span>
      </div>

      {group.employees.length === 0 ? (
        <p className="py-1.5 text-center text-xs text-muted-foreground">{t('productivity.step2.noEmployees')}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {group.employees.map((emp, idx) => (
            <div key={emp.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Avatar name={emp.name} colorIndex={idx} size="xs" />
                <p className="truncate text-xs font-medium text-foreground">{emp.name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(emp.id)}
                className="ml-1 h-5 w-5 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {group.employees.length > 0 && (
        <div className="mt-2.5">
          <MesaControls group={group} products={products} onProduct={onProduct} onQty={onQty} />
        </div>
      )}
    </div>
  )
}
