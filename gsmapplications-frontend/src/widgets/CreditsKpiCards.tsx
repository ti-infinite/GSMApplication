import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Clock, DollarSign, Scale } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { formatMoney, formatQty, isCurrentMonth, type CreditSummary } from '@/entities/credit'

type Theme = 'primary' | 'success' | 'warning' | 'chart-2' | 'chart-3'
const THEME: Record<Theme, { text: string; ring: string }> = {
  primary: { text: 'text-primary', ring: 'ring-primary/15' },
  success: { text: 'text-success', ring: 'ring-success/15' },
  warning: { text: 'text-warning', ring: 'ring-warning/15' },
  'chart-2': { text: 'text-[var(--chart-2)]', ring: 'ring-[var(--chart-2)]/15' },
  'chart-3': { text: 'text-[var(--chart-3)]', ring: 'ring-[var(--chart-3)]/15' },
}

function StatCard({ icon: Icon, label, value, sublabel, theme, onClick }: {
  icon: typeof Clock; label: string; value: string; sublabel: string; theme: Theme; onClick?: () => void
}) {
  const th = THEME[theme]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex min-h-32 flex-col overflow-hidden rounded-xl border bg-card px-5 py-4 text-left shadow-sm ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md',
        th.ring, onClick && 'cursor-pointer'
      )}
    >
      <Icon className={cn('pointer-events-none absolute -bottom-3 -right-3 size-24 opacity-20', th.text)} aria-hidden="true" />
      <p className="relative text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn('relative mt-1 font-mono text-3xl font-bold tabular-nums', th.text)}>{value}</p>
      <p className="relative mt-1 text-xs text-muted-foreground">{sublabel}</p>
    </Tag>
  )
}

// The five numbers purchasing looks at first: what is waiting, what this month cost, how much
// product was credited, how many were approved, and how many pre-alerts still need a credit.
export function CreditsKpiCards({ credits, openPrealerts, loading, onOpenPrealerts }: {
  credits: CreditSummary[]; openPrealerts: number; loading: boolean; onOpenPrealerts: () => void
}) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    )
  }
  const pending = credits.filter((c) => c.status === 'pending').length
  const month = credits.filter((c) => isCurrentMonth(c.report_date) && c.status !== 'denied')
  const monthUsd = month.reduce((s, c) => s + (c.total_credit_cost ?? 0), 0)
  const monthQty = month.reduce((s, c) => s + (c.total_qty_credit ?? 0), 0)
  const approved = credits.filter((c) => c.status === 'approved' && isCurrentMonth(c.report_date)).length
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard icon={Clock} theme="warning" label={t('credits.kpi.pending')} value={String(pending)} sublabel={t('credits.kpi.pendingSub')} />
      <StatCard icon={DollarSign} theme="primary" label={t('credits.kpi.monthUsd')} value={formatMoney(monthUsd)} sublabel={t('credits.kpi.monthUsdSub')} />
      <StatCard icon={Scale} theme="chart-2" label={t('credits.kpi.monthQty')} value={formatQty(monthQty, 0)} sublabel={t('credits.kpi.monthQtySub')} />
      <StatCard icon={CheckCircle2} theme="success" label={t('credits.kpi.approved')} value={String(approved)} sublabel={t('credits.kpi.approvedSub')} />
      <StatCard icon={AlertTriangle} theme="chart-3" label={t('credits.kpi.openPrealerts')} value={String(openPrealerts)} sublabel={t('credits.kpi.openPrealertsSub')} onClick={onOpenPrealerts} />
    </div>
  )
}
