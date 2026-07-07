import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { WizardFooter } from '@/shared/ui/wizard-footer'
import { ModeToggle } from './employees/ModeToggle'
import { GroupCountStepper } from './employees/GroupCountStepper'
import { QuickAssign } from './employees/QuickAssign'
import { AvailableEmployees } from './employees/AvailableEmployees'
import { GroupCard } from './employees/GroupCard'
import { IndividualCard } from './employees/IndividualCard'
import type { ConfiguredProduct } from '../model/types'
import type { useEmployeeGroups } from '../model/useEmployeeGroups'

type GroupState = ReturnType<typeof useEmployeeGroups>

interface Props {
  totalEmployees: number
  groups:         GroupState
  products:       ConfiguredProduct[]
  onBack:         () => void
  onConfirm:      () => void
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
        <ModeToggle mode={g.mode} onChange={g.setMode} />
        {g.mode === 'groups' && (
          <GroupCountStepper count={g.groupCount} onChange={g.setGroupCount} />
        )}
      </div>

      <QuickAssign products={products} g={g} />

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[300px_1fr] lg:grid-cols-[420px_1fr]">

        {/* ── Available employees — sticky sidebar ── */}
        <AvailableEmployees
          count={g.available.length}
          total={totalEmployees}
          query={g.searchQuery}
          onQuery={g.setSearchQuery}
          filtered={g.filteredAvailable}
          mode={g.mode}
          groups={g.groups}
          onAdd={g.addToGroup}
          onAddIndividual={g.addIndividual}
        />

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
