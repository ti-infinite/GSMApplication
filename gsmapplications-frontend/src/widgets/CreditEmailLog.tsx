import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusCell, type StatusTone } from '@/shared/ui/status-cell'
import { formatDateTime, type EmailLog } from '@/entities/credit'

const STATUS_TONE: Record<EmailLog['status'], StatusTone> = { sent: 'green', failed: 'red', disabled: 'neutral' }

export function CreditEmailLog({ emails, loading }: { emails: EmailLog[]; loading: boolean }) {
  const { t, i18n } = useTranslation()
  if (loading) return <Skeleton className="h-16 w-full" />
  if (emails.length === 0) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-4" /> {t('credits.emails.empty')}</p>
  return (
    <ul className="divide-y divide-border rounded-lg border border-border text-sm">
      {emails.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusCell tone={STATUS_TONE[e.status]} className="min-w-0">{t(`credits.emails.status.${e.status}`)}</StatusCell>
            <span className="font-medium">{t(`credits.emails.kind.${e.kind}`, { defaultValue: e.kind })}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(e.sent_at, i18n.language)}</span>
          </div>
          <p className="truncate text-muted-foreground" title={e.subject}>{e.subject}</p>
          <p className="text-xs text-muted-foreground"><b>{t('credits.emails.to')}:</b> {e.recipients}{e.cc ? <> · <b>{t('credits.emails.cc')}:</b> {e.cc}</> : null}</p>
          {e.error && <p className="text-xs text-destructive">{e.error}</p>}
        </li>
      ))}
    </ul>
  )
}
