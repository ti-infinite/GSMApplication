import { useTranslation } from 'react-i18next'
import { Sprout, ChevronDown, Check } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { growerLabel } from '../../lib/growerLabel'
import type { EmployeeGroup, ConfiguredProduct } from '../../model/types'
import type { useEmployeeGroups } from '../../model/useEmployeeGroups'

type GroupState = ReturnType<typeof useEmployeeGroups>

// Quick assign: pick which mesas get each product in one go (multiselect),
// instead of choosing product per mesa. The grower is shown so two same-named
// products with different growers can be told apart.
export function QuickAssign({ products, g }: { products: ConfiguredProduct[]; g: GroupState }) {
  const { t } = useTranslation()
  const mesas = g.groups.filter(grp => grp.employees.length > 0)
  if (products.length === 0 || mesas.length === 0) return null

  // One product → it's auto-assigned to every mesa (see the effect in Step2Employees).
  if (products.length === 1) {
    const only = products[0]
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <Sprout className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-foreground">{only.product.MasterProductName}</span>
        {only.growers.length > 0 && <span className="text-xs text-muted-foreground">· {growerLabel(only)}</span>}
        <span className="ml-1 text-sm text-muted-foreground">{t('productivity.step2.autoAssigned')}</span>
      </div>
    )
  }

  const unassigned = mesas.filter(m => !m.productId).length

  // One product per mesa → assigning a mesa to a product moves it off its previous one.
  const toggle = (grp: EmployeeGroup, cp: ConfiguredProduct) => {
    if (grp.productId === cp.id) g.setGroupProduct(grp.id, '')
    else { g.setGroupProduct(grp.id, cp.id); g.setGroupQty(grp.id, cp.defaultQty) }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('productivity.step2.quickAssign')}</p>
        {unassigned > 0 && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            {t('productivity.step2.unassignedMesas', { count: unassigned })}
          </span>
        )}
      </div>

      {/* Horizontal product palette — fixed-size chips, scrolls instead of growing with N products */}
      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
        {products.map(cp => {
          const count = mesas.filter(m => m.productId === cp.id).length
          return (
            <DropdownMenu key={cp.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-72 shrink-0 flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-tight text-foreground">{cp.product.MasterProductName}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <Sprout className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
                      <span className="truncate">{growerLabel(cp) || '—'}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {t('productivity.step2.mesasCount', { count })}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="scrollbar-hide max-h-72 w-60 overflow-y-auto">
                {mesas.map(m => {
                  const on = m.productId === cp.id
                  const otherCp = !on && m.productId ? products.find(p => p.id === m.productId) : undefined
                  return (
                    <DropdownMenuItem key={m.id} onSelect={e => { e.preventDefault(); toggle(m, cp) }} className="gap-2">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-primary bg-primary text-white' : 'border-border'}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      {otherCp && <span className="max-w-28 shrink-0 truncate text-xs text-muted-foreground">{otherCp.product.MasterProductName}</span>}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </div>
    </div>
  )
}
