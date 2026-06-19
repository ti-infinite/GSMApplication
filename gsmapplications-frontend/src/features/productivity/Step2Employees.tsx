import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Users, User, ChevronDown, Plus, Sprout, Check } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { WizardFooter } from './WizardFooter'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { Employee, EmployeeGroup, ConfiguredProduct } from './types'
import type { useEmployeeGroups } from './hooks/useEmployeeGroups'

type GroupState = ReturnType<typeof useEmployeeGroups>

// Same product can be configured twice with different growers → show the grower
// so the user can tell them apart when assigning.
const growerLabel = (cp: ConfiguredProduct): string => {
  if (cp.growers.length === 0) return ''
  const first = cp.growers[0].grower.name
  return cp.growers.length > 1 ? `${first} +${cp.growers.length - 1}` : first
}

interface Props {
  totalEmployees: number
  groups:         GroupState
  products:       ConfiguredProduct[]
  onBack:         () => void
  onConfirm:      () => void
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const COLORS = [
  'bg-blue-500',   'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500',   'bg-teal-500',
]

function Avatar({ name, idx, sm }: { name: string; idx: number; sm?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${COLORS[idx % COLORS.length]} ${
      sm ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-xs'
    }`}>
      {initials(name)}
    </span>
  )
}

export function Step2Employees({ totalEmployees, groups: g, products, onBack, onConfirm }: Props) {
  const { t } = useTranslation()
  const totalAssigned = g.groups.reduce((sum, gr) => sum + gr.employees.length, 0)
  const activeGroups  = g.groups.filter(gr => gr.employees.length > 0)

  // Product chosen for a mesa → default its qty (override on every product change).
  const pickProduct = (groupId: string, productId: string) => {
    g.setGroupProduct(groupId, productId)
    const p = products.find(x => x.id === productId)
    if (p) g.setGroupQty(groupId, p.defaultQty)
  }

  // Single product → auto-assign it to every mesa with people (no manual picking).
  useEffect(() => {
    if (products.length !== 1) return
    const only = products[0]
    for (const grp of g.groups) {
      if (grp.employees.length > 0 && grp.productId !== only.id) {
        g.setGroupProduct(grp.id, only.id)
        g.setGroupQty(grp.id, only.defaultQty)
      }
    }
  }, [products, g.groups, g.setGroupProduct, g.setGroupQty])

  return (
    <div className="flex flex-col gap-6">

      {/* Mode toggle + group count */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full rounded-lg border border-border sm:w-auto">
          <ModeBtn active={g.mode === 'groups'}     onClick={() => g.setMode('groups')}     icon={<Users className="h-4 w-4" />} label={t('productivity.step2.modeGroups')} />
          <ModeBtn active={g.mode === 'individual'} onClick={() => g.setMode('individual')} icon={<User  className="h-4 w-4" />} label={t('productivity.step2.modeIndividual')} />
        </div>

        {g.mode === 'groups' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t('productivity.step2.groupsLabel')}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => g.setGroupCount(g.groupCount - 1)} disabled={g.groupCount <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted disabled:opacity-40">
                −
              </button>
              <span className="w-4 text-center text-sm font-semibold text-foreground">{g.groupCount}</span>
              <button type="button" onClick={() => g.setGroupCount(g.groupCount + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted">
                +
              </button>
            </div>
          </div>
        )}
      </div>

      <QuickAssign products={products} g={g} />

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[300px_1fr] lg:grid-cols-[420px_1fr]">

        {/* ── Available employees — sticky sidebar ── */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:sticky md:top-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('productivity.step2.available')}
            </p>
            <span className="text-xs font-medium text-muted-foreground">
              {g.available.length}/{totalEmployees}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('productivity.step2.searchEmployee')}
              value={g.searchQuery}
              onChange={e => g.setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto scrollbar-hide">
            {g.filteredAvailable.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {g.searchQuery ? t('productivity.step2.noSearchResults') : t('productivity.step2.allAssigned')}
              </p>
            ) : (
              g.filteredAvailable.map((emp, idx) => (
                <AvailableRow
                  key={emp.id}
                  employee={emp}
                  colorIdx={idx}
                  mode={g.mode}
                  groups={g.groups}
                  onAdd={groupId => g.addToGroup(emp, groupId)}
                  onAddIndividual={() => g.addIndividual(emp)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel — mesas (groups or individuals), each with its product + qty ── */}
        {g.mode === 'groups' ? (
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
            {g.groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                products={products}
                onRemove={(empId) => g.removeFromGroup(empId, group.id)}
                onProduct={pickProduct}
                onQty={g.setGroupQty}
              />
            ))}
          </div>
        ) : g.groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t('productivity.step2.individualEmpty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            {g.groups.map((group, idx) => (
              <IndividualCard
                key={group.id}
                group={group}
                colorIdx={idx}
                products={products}
                onRemove={() => g.removeIndividual(group.id)}
                onProduct={pickProduct}
                onQty={g.setGroupQty}
              />
            ))}
          </div>
        )}
      </div>

      <WizardFooter
        hint={
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{totalAssigned}</strong> {t('productivity.step2.assigned')}</span>
            <span><strong className="text-foreground">{g.available.length}</strong> {t('productivity.step2.availableCount')}</span>
            <span>{t('productivity.step2.activeGroups')} <strong className="text-foreground">{activeGroups.length}</strong></span>
          </div>
        }
        onBack={onBack}
        backLabel={t('productivity.common.back')}
        primaryLabel={t('productivity.step2.confirm')}
        onPrimary={onConfirm}
        primaryDisabled={!g.isComplete}
      />
    </div>
  )
}

/* ── Mesa product + qty controls (shared by group & individual cards) ── */
function MesaControls({ group, products, onProduct, onQty }: {
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

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px] sm:flex-none ${
        active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
      }`}
    >
      {icon}{label}
    </button>
  )
}

function AvailableRow({ employee, colorIdx, mode, groups, onAdd, onAddIndividual }: {
  employee: Employee; colorIdx: number; mode: 'groups' | 'individual'; groups: EmployeeGroup[]
  onAdd: (groupId: string) => void; onAddIndividual: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
      <Avatar name={employee.name} idx={colorIdx} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{employee.name}</p>
        <p className="text-xs text-muted-foreground">{employee.role}</p>
      </div>

      {mode === 'individual' ? (
        <button
          type="button"
          onClick={onAddIndividual}
          title={t('productivity.step2.addIndividual')}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : groups.length <= 5 ? (
        <TooltipProvider>
          <div className="flex shrink-0 gap-1">
            {groups.map((gr, i) => (
              <Tooltip key={gr.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onAdd(gr.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">
                    {i + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{gr.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="group shrink-0 gap-1.5">
              {t('productivity.step2.group')}
              <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-150 group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 min-w-[120px] overflow-y-auto scrollbar-hide">
            {groups.map(gr => (
              <DropdownMenuItem key={gr.id} onSelect={() => onAdd(gr.id)}>
                {gr.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function GroupCard({ group, products, onRemove, onProduct, onQty }: {
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
                <Avatar name={emp.name} idx={idx} sm />
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

// Individual mode: each employee is its OWN mesa (one TRX), with its own product + qty.
function IndividualCard({ group, colorIdx, products, onRemove, onProduct, onQty }: {
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
        <Avatar name={emp?.name ?? group.name} idx={colorIdx} />
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

// Quick assign: pick which mesas get each product in one go (multiselect),
// instead of choosing product per mesa. The grower is shown so two same-named
// products with different growers can be told apart.
function QuickAssign({ products, g }: { products: ConfiguredProduct[]; g: GroupState }) {
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
