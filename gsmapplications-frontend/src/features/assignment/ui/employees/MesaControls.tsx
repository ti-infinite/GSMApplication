import { useTranslation } from 'react-i18next'
import { Sprout } from 'lucide-react'
import { Combobox } from '@/shared/ui/combobox'
import { growerLabel } from '../../lib/growerLabel'
import type { EmployeeGroup, ConfiguredProduct } from '../../model/types'

/** Mesa product + qty controls (shared by group & individual cards). */
export function MesaControls({ group, products, onProduct, onQty }: {
  group:     EmployeeGroup
  products:  ConfiguredProduct[]
  onProduct: (groupId: string, productId: string) => void
  onQty:     (groupId: string, qty: number) => void
}) {
  const { t } = useTranslation()
  const cp = products.find(p => p.id === group.productId)
  return (
    <div className="flex flex-col gap-2 border-t border-border/60 pt-2.5">
      <Combobox
        size="sm"
        options={products.map(p => ({ value: p.id, label: p.product.MasterProductName, description: growerLabel(p) || undefined, badge: p.skuPrefix }))}
        value={group.productId ?? ''}
        onChange={pid => onProduct(group.id, pid)}
        placeholder={t('productivity.step2.selectProduct')}
        emptyMessage={t('productivity.step2.noProducts')}
      />
      {cp && cp.growers.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sprout className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
          <span className="truncate">{growerLabel(cp)}</span>
        </div>
      )}
      {cp && (
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('productivity.step2.qty')}
          </label>
          <input
            type="number" min="1" step="1" inputMode="numeric"
            value={group.qty || ''}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              onQty(group.id, isNaN(v) || v <= 0 ? 0 : v)
            }}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0"
          />
        </div>
      )}
    </div>
  )
}
