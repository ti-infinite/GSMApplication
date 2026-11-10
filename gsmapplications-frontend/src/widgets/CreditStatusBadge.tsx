import { useTranslation } from 'react-i18next'
import { StatusCell, type StatusTone } from '@/shared/ui/status-cell'
import type { CreditStatus } from '@/entities/credit'
import type { PreAlertStatus } from '@/entities/prealert'

const CREDIT_TONE: Record<CreditStatus, StatusTone> = { pending: 'yellow', approved: 'green', denied: 'red' }
const PREALERT_TONE: Record<PreAlertStatus, StatusTone> = { open: 'yellow', credited: 'green', dismissed: 'neutral' }

// Status cells share the tinted-cell look of the Gross Margin cost breakdown (StatusCell).
export function CreditStatusBadge({ status }: { status: CreditStatus }) {
  const { t } = useTranslation()
  return <StatusCell tone={CREDIT_TONE[status]}>{t(`credits.status.${status}`)}</StatusCell>
}

export function PreAlertStatusBadge({ status }: { status: PreAlertStatus }) {
  const { t } = useTranslation()
  return <StatusCell tone={PREALERT_TONE[status]}>{t(`credits.prealerts.status.${status}`)}</StatusCell>
}

export function WhsChip({ whs }: { whs: string }) {
  return <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">{whs}</span>
}
