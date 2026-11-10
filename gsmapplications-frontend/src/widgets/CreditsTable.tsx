import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { FilterBar, FilterField } from '@/shared/ui/filter-bar'
import { Combobox } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
import { ErrorState } from '@/shared/components/ErrorState'
import { useLocale } from '@/shared/hooks/useLocale'
import { WAREHOUSES, formatDate, formatDateTime, formatMoney, formatQty, useCredits, type CreditStatus, type CreditSummary, type Whs } from '@/entities/credit'
import { CreditStatusBadge, WhsChip } from './CreditStatusBadge'

const normalize = (v: string | null) => (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

// Third-party credits filed by Quality, filtered by status / warehouse / text; a row opens the
// credit. The list refreshes every minute.
export function CreditsTable({ onLoaded }: { onLoaded?: (credits: CreditSummary[], updatedAt: number) => void }) {
  const { t, i18n } = useTranslation()
  const { locale } = useLocale()
  const navigate = useNavigate()
  const [status, setStatus] = useState<CreditStatus | ''>('')
  const [whs, setWhs] = useState<Whs | ''>('')
  const [search, setSearch] = useState('')
  const { items, isLoading, error, refetch, dataUpdatedAt } = useCredits({ status, whs })

  useEffect(() => { if (!isLoading && !error) onLoaded?.(items, dataUpdatedAt) }, [items, isLoading, error, dataUpdatedAt, onLoaded])

  const filtered = useMemo(() => {
    const needle = normalize(search)
    if (!needle) return items
    return items.filter((c) => normalize(c.company_name).includes(needle) || normalize(c.po_display).includes(needle) || normalize(c.po_number).includes(needle) || String(c.id) === needle.replace('#', ''))
  }, [items, search])

  const columns: TableColumn<CreditSummary>[] = [
    { key: 'id', header: t('credits.table.id'), sortable: true, sortValue: (c) => c.id, render: (c) => <span className="font-mono font-semibold text-primary">#{c.id}</span> },
    { key: 'report_date', header: t('credits.table.date'), sortable: true, sortValue: (c) => c.report_date, render: (c) => formatDate(c.report_date, i18n.language) },
    { key: 'created_at', header: t('credits.table.created'), sortable: true, hideMobile: true, sortValue: (c) => c.created_at, render: (c) => <span className="text-muted-foreground">{formatDateTime(c.created_at, i18n.language)}</span> },
    { key: 'jd', header: t('credits.table.jd'), align: 'right', hideMobile: true, sortValue: (c) => c.jd ?? 0, render: (c) => <span className="font-mono tabular-nums text-muted-foreground">{c.jd ?? '—'}</span> },
    { key: 'company_name', header: t('credits.table.company'), sortable: true, render: (c) => <span className="font-medium">{c.company_name}</span> },
    { key: 'po', header: t('credits.table.po'), hideMobile: true, sortValue: (c) => c.po_display ?? '', render: (c) => <span className="font-mono tabular-nums">{c.po_display ?? '—'}</span> },
    { key: 'whs', header: t('credits.table.whs'), sortable: true, render: (c) => <WhsChip whs={c.whs} /> },
    { key: 'qty', header: t('credits.table.qty'), align: 'right', sortable: true, sortValue: (c) => c.total_qty_credit ?? 0, render: (c) => <span className="font-mono tabular-nums">{formatQty(c.total_qty_credit)}</span> },
    { key: 'usd', header: t('credits.table.usd'), align: 'right', sortable: true, sortValue: (c) => c.total_credit_cost ?? 0, render: (c) => <span className="font-mono font-semibold tabular-nums">{formatMoney(c.total_credit_cost)}</span> },
    { key: 'status', header: t('credits.table.status'), sortable: true, sortValue: (c) => c.status, render: (c) => <CreditStatusBadge status={c.status} /> },
  ]

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <FilterBar toggleLabel={t('credits.common.filters')}>
        <FilterField label={t('credits.filters.status')} width="sm:w-48">
          <Combobox
            value={status}
            onChange={(v) => setStatus((v || '') as CreditStatus | '')}
            placeholder={t('credits.filters.allStatus')}
            emptyMessage={t('credits.common.noResults')}
            options={[
              { value: '', label: t('credits.filters.allStatus') },
              ...(['pending', 'approved', 'denied'] as const).map((s) => ({ value: s, label: t(`credits.status.${s}`) })),
            ]}
          />
        </FilterField>
        <FilterField label={t('credits.filters.whs')} width="sm:w-48">
          <Combobox
            value={whs}
            onChange={(v) => setWhs((v || '') as Whs | '')}
            placeholder={t('credits.filters.allWhs')}
            emptyMessage={t('credits.common.noResults')}
            options={[
              { value: '', label: t('credits.filters.allWhs') },
              ...WAREHOUSES.map((w) => ({ value: w.code, label: w.code, description: t(`credits.whs.${w.code}`) })),
            ]}
          />
        </FilterField>
        <FilterField label={t('credits.common.search')} width="sm:w-64">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('credits.filters.searchPlaceholder')} className="h-8 pl-8" />
          </div>
        </FilterField>
      </FilterBar>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(c) => String(c.id)}
          loading={isLoading}
          pageSize={25}
          emptyMessage={t('credits.table.empty')}
          onRowClick={(c) => navigate(`/${locale}/dashboard/credits/credit?id=${c.id}`)}
        />
      </div>
    </div>
  )
}
