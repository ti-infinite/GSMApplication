import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, MapPin, Search, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { WizardFooter } from './WizardFooter'
import { Combobox } from '@/shared/ui/combobox'
import type { Grower, MasterProduct, EmployeeGroup, AssignmentMode, ParameterAttribute, SelectedGrower } from './types'

const PAGE_SIZE = 10

interface Props {
  growers:                Grower[]
  selected:               Record<string, SelectedGrower>   // lifted to the wizard so it survives step changes
  onSelectedChange:       (next: Record<string, SelectedGrower>) => void
  productionType:         string
  productionTypes:        ParameterAttribute[]
  onProductionTypeChange: (v: string) => void
  product:                MasterProduct
  mode:                   AssignmentMode
  employeeGroups:         EmployeeGroup[]
  onBack:                 () => void
  onConfirm:              (growers: SelectedGrower[]) => void
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function Step3Grower({
  growers, selected, onSelectedChange,
  productionType, productionTypes, onProductionTypeChange,
  product, mode, employeeGroups, onBack, onConfirm,
}: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(0)

  const filtered = search.trim()
    ? growers.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.country ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : growers

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSearch = (v: string) => { setSearch(v); setPage(0) }

  const toggleGrower = (grower: Grower) => {
    const next = { ...selected }
    if (next[grower.id]) delete next[grower.id]
    else next[grower.id] = { grower, itc: '' }
    onSelectedChange(next)
  }

  const setGrowerItc = (growerId: string, itc: string) => {
    if (selected[growerId]) onSelectedChange({ ...selected, [growerId]: { ...selected[growerId], itc } })
  }

  const selectedList   = Object.values(selected)
  const selectedCount  = selectedList.length
  const missingItc     = selectedList.filter(s => !s.itc.trim()).length
  const totalEmployees = employeeGroups.reduce((s, g) => s + g.employees.length, 0)
  const canConfirm     = selectedCount > 0 && missingItc === 0 && productionType.length > 0

  // Page index where a selected grower lives → lets the panel jump to its ITC input.
  const pageOfGrower = (growerId: string) => {
    const idx = filtered.findIndex(g => g.id === growerId)
    return idx >= 0 ? Math.floor(idx / PAGE_SIZE) : -1
  }

  const itcInputCls = 'w-24 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px]">

        {/* ── Left: supplier table with pagination ── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('productivity.step3.availableGrowers')}
            <span className="ml-2 font-normal text-muted-foreground/60">({filtered.length})</span>
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('productivity.step3.searchPlaceholder')}
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-8 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-8 px-4 py-2.5" />
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.step3.colName')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.step3.colId')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.step3.colCountry')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('productivity.step3.colItc')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{t('productivity.step3.noResults')}</td>
                    </tr>
                  ) : (
                    paginated.map(grower => {
                      const isSel = !!selected[grower.id]
                      return (
                        <tr key={grower.id} onClick={() => toggleGrower(grower)}
                          className={`cursor-pointer transition-colors hover:bg-muted/30 ${isSel ? 'bg-primary/10' : ''}`}>
                          <td className="px-4 py-3">
                            <div className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${isSel ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                              {isSel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{grower.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{grower.idThirdSupplier}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {grower.country && <MapPin className="h-3 w-3 shrink-0" />}
                              {grower.country ?? '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isSel ? (
                              <input
                                type="text" inputMode="numeric"
                                value={selected[grower.id].itc}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setGrowerItc(grower.id, e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder={t('productivity.step3.itcPlaceholder')}
                                className={itcInputCls}
                              />
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col divide-y divide-border md:hidden">
              {paginated.map(grower => {
                const isSel = !!selected[grower.id]
                return (
                  <div key={grower.id}
                    className={`flex flex-col gap-2 px-4 py-3 transition-colors ${isSel ? 'bg-primary/10' : ''}`}>
                    <button type="button" onClick={() => toggleGrower(grower)} className="flex items-center gap-3 text-left">
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${isSel ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                        {isSel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {initials(grower.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{grower.name}</p>
                        <p className="text-xs text-muted-foreground">{grower.country ?? grower.idThirdSupplier}</p>
                      </div>
                    </button>
                    {isSel && (
                      <input
                        type="text" inputMode="numeric"
                        value={selected[grower.id].itc}
                        onChange={e => setGrowerItc(grower.id, e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder={t('productivity.step3.itcPlaceholder')}
                        className="ml-7 w-32 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {t('productivity.step3.paginationRange', {
                  from:  page * PAGE_SIZE + 1,
                  to:    Math.min((page + 1) * PAGE_SIZE, filtered.length),
                  total: filtered.length,
                })}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(p => p - 1)} disabled={page === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-medium text-foreground">{page + 1} / {totalPages}</span>
                <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: selection + fields + summary ── */}
        <div className="flex flex-col gap-4">

          {/* Section header — levels with "Productores disponibles" on the left */}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('productivity.step3.detailsTitle')}
          </p>

          {/* Selected growers */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('productivity.step3.selectedGrowers')}
              {selectedCount > 0 && <span className="ml-1.5 text-primary">({selectedCount})</span>}
            </p>
            {selectedCount === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">{t('productivity.step3.selectGrowersHint')}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {selectedList.map(({ grower, itc }) => {
                  const gp = pageOfGrower(grower.id)
                  return (
                    <button
                      key={grower.id}
                      type="button"
                      onClick={() => gp >= 0 && setPage(gp)}
                      title={gp >= 0 ? `pág. ${gp + 1}` : undefined}
                      className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${itc.trim() ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                        {itc.trim() ? <Check className="h-3 w-3" strokeWidth={3} /> : '!'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{grower.name}</span>
                        {itc.trim() && <span className="block text-xs text-muted-foreground">ITC {itc}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Production Type */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('productivity.step3.productionType')}
            </label>
            <Combobox
              options={productionTypes.map(a => ({ value: a.code, label: a.shortName, description: a.descr }))}
              value={productionType}
              onChange={onProductionTypeChange}
              placeholder={t('productivity.step3.selectType')}
              emptyMessage={t('productivity.step3.noTypes')}
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('productivity.step3.summary')}</p>
            <dl className="flex flex-col gap-2">
              {[
                { label: t('productivity.step3.sumSku'),        value: product.SKU },
                { label: t('productivity.step3.sumProduct'),    value: product.MasterProductName },
                { label: t('productivity.step3.sumAssignment'), value: mode === 'groups' ? t('productivity.step3.assignmentGroups', { count: employeeGroups.length }) : t('productivity.step3.assignmentIndividual') },
                { label: t('productivity.step3.sumEmployees'),  value: String(totalEmployees) },
                { label: t('productivity.step3.sumProduction'), value: productionTypes.find(pt => pt.code === productionType)?.shortName ?? '—' },
                { label: t('productivity.step3.sumGrowers'),    value: String(selectedCount) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="truncate text-right font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <WizardFooter
        hint={
          <>
            {selectedCount === 0     && <span className="text-xs text-muted-foreground">{t('productivity.step3.hintSelectGrower')}</span>}
            {selectedCount > 0 && missingItc > 0 && <span className="text-xs text-amber-600">{t('productivity.step3.hintMissingItc')}</span>}
            {selectedCount > 0 && missingItc === 0 && !productionType && <span className="text-xs text-amber-600">{t('productivity.step3.hintSelectType')}</span>}
          </>
        }
        onBack={onBack}
        backLabel={t('productivity.common.back')}
        primaryLabel={t('productivity.step3.confirm')}
        primaryIcon={<CheckCircle2 className="h-4 w-4" />}
        onPrimary={() => canConfirm && onConfirm(selectedList)}
        primaryDisabled={!canConfirm}
      />
    </div>
  )
}