import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { FilterBar, FilterField } from '@/shared/ui/filter-bar'
import { Combobox } from '@/shared/ui/combobox'
import { ErrorState } from '@/shared/components/ErrorState'
import { useLocale } from '@/shared/hooks/useLocale'
import { WAREHOUSES, formatDate, formatQty, type Whs } from '@/entities/credit'
import { usePrealerts, type PreAlertStatus, type PreAlertSummary } from '@/entities/prealert'
import { PreAlertStatusBadge, WhsChip } from './CreditStatusBadge'


// Pre-alerts filed by Quality on arrival; a row opens the pre-alert. Refreshes every minute.
export function PreAlertsTable() {
  const { t, i18n } = useTranslation()
  const { locale } = useLocale()
  const navigate = useNavigate()
  const [status, setStatus] = useState<PreAlertStatus | ''>('')
  const [whs, setWhs] = useState<Whs | ''>('')
  const { items, open, total, isLoading, error, refetch } = usePrealerts({ status, whs })

  const columns: TableColumn<PreAlertSummary>[] = [
    { key: 'id', header: t('credits.table.id'), sortable: true, sortValue: (p) => p.id, render: (p) => <span className="font-mono font-semibold text-primary">#{p.id}</span> },
    { key: 'report_date', header: t('credits.table.date'), sortable: true, sortValue: (p) => p.report_date, render: (p) => formatDate(p.report_date, i18n.language) },
    { key: 'company_name', header: t('credits.table.company'), sortable: true, render: (p) => <span className="font-medium">{p.company_name}</span> },
    { key: 'products', header: t('credits.prealerts.table.products'), render: (p) => <span className="block max-w-xs truncate" title={p.product_names.join(', ')}>{p.product_names.join(', ') || '—'}</span> },
    { key: 'po', header: t('credits.table.po'), hideMobile: true, render: (p) => <span className="font-mono tabular-nums">{p.po_display ?? '—'}</span> },
    { key: 'whs', header: t('credits.table.whs'), sortable: true, render: (p) => <WhsChip whs={p.whs} /> },
    { key: 'pct', header: t('credits.prealerts.table.pct'), align: 'right', sortable: true, sortValue: (p) => p.max_problem_pct ?? 0, render: (p) => p.max_problem_pct === null ? '—' : <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-xs font-semibold text-destructive">{formatQty(p.max_problem_pct, 0)}%</span> },
    { key: 'photos', header: t('credits.prealerts.table.photos'), align: 'right', hideMobile: true, render: (p) => <span className="inline-flex items-center gap-1 font-mono text-muted-foreground"><Camera className="size-3.5" />{p.photo_count}</span> },
    { key: 'qa', header: t('credits.table.qa'), hideMobile: true, render: (p) => p.qa_inspector ?? '—' },
    { key: 'status', header: t('credits.table.status'), sortable: true, sortValue: (p) => p.status, render: (p) => <PreAlertStatusBadge status={p.status} /> },
    { key: 'credit', header: t('credits.prealerts.table.credit'), render: (p) => p.credit_id ? <span className="font-mono text-primary">#{p.credit_id}</span> : <span className="text-muted-foreground">—</span> },
  ]

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterBar toggleLabel={t('credits.common.filters')}>
          <FilterField label={t('credits.filters.status')} width="sm:w-48">
            <Combobox
              value={status}
              onChange={(v) => setStatus((v || '') as PreAlertStatus | '')}
              placeholder={t('credits.filters.allStatus')}
              emptyMessage={t('credits.common.noResults')}
              options={[
                { value: '', label: t('credits.filters.allStatus') },
                ...(['open', 'credited', 'dismissed'] as const).map((s) => ({ value: s, label: t(`credits.prealerts.status.${s}`) })),
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
        </FilterBar>
        <p className="text-sm text-muted-foreground">
          <b className="font-mono text-warning">{open}</b> {t('credits.prealerts.kpiOpen').toLowerCase()} · {total} {t('credits.common.all').toLowerCase()}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <DataTable
          columns={columns}
          data={items}
          rowKey={(p) => String(p.id)}
          loading={isLoading}
          pageSize={25}
          emptyMessage={t('credits.prealerts.table.empty')}
          onRowClick={(p) => navigate(`/${locale}/dashboard/credits/prealert?id=${p.id}`)}
        />
      </div>
    </div>
  )
}
