import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { formatDateTime, type AuditChange, type AuditEvent } from '@/entities/credit'

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  return String(v)
}

// Who did what and when; edits expand into the fields that changed (line number included).
export function CreditAuditLog({ events, loading }: { events: AuditEvent[]; loading: boolean }) {
  const { t, i18n } = useTranslation()
  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  if (events.length === 0) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><History className="size-4" /> {t('credits.history.empty')}</p>

  const fieldLabel = (c: AuditChange) => {
    const base = t(`credits.history.field.${c.field}`, { defaultValue: c.field })
    return c.line ? `${t('credits.history.line', { n: c.line })} · ${base}` : base
  }
  const changeText = (c: AuditChange) => {
    if (c.field === 'line_added') return t('credits.history.lineAdded', { n: c.line, name: show(c.new) })
    if (c.field === 'line_removed') return t('credits.history.lineRemoved', { n: c.line, name: show(c.old) })
    return null
  }

  return (
    <ol className="relative ml-2 border-l border-border pl-5">
      {events.map((ev) => (
        <li key={ev.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{t(`credits.history.action.${ev.action}`, { defaultValue: ev.action })}</span>
            <span className="text-muted-foreground">· {ev.actor_name || ev.actor_email || '—'}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(ev.at, i18n.language)}</span>
            {ev.changes.length > 0 && <span className="text-xs text-muted-foreground">({t('credits.history.changes', { count: ev.changes.length })})</span>}
          </div>
          {ev.changes.length > 0 && (
            <ul className="mt-1.5 grid gap-1 text-xs sm:grid-cols-2">
              {ev.changes.map((c, i) => {
                const special = changeText(c)
                return (
                  <li key={i} className="rounded-md bg-muted/40 px-2 py-1">
                    {special ?? (
                      <>
                        <span className="text-muted-foreground">{fieldLabel(c)}: </span>
                        {c.old !== undefined && c.old !== null && <span className="line-through opacity-60">{show(c.old)}</span>}
                        {c.old !== undefined && c.old !== null && ' → '}
                        <span className="font-medium">{show(c.new)}</span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}
