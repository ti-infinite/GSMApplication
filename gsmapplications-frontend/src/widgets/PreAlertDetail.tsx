import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/components/ErrorState'
import { useLocale } from '@/shared/hooks/useLocale'
import { FLAG_KEYS, FLAG_LABEL_KEY, formatDate, formatDateTime, formatQty } from '@/entities/credit'
import { prealertPhotoUrl, usePrealert, usePrealertEmails, usePrealertEvents } from '@/entities/prealert'
import { DismissOrReopenPrealertButton, PreviewPrealertEmailLink, ResendPrealertButton } from '@/features/prealertActions'
import { PreAlertStatusBadge, WhsChip } from './CreditStatusBadge'
import { CreditPhotoGallery } from './CreditPhotoGallery'
import { CreditAuditLog } from './CreditAuditLog'
import { CreditEmailLog } from './CreditEmailLog'

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm">{value ?? '—'}</p>
    </div>
  )
}

// A pre-alert as filed by Quality (read-only here): shipment facts, affected products with the
// % affected and temperature, photos, the warehouse e-mail with preview/resend, dismiss/reopen.
export function PreAlertDetail({ id }: { id: number }) {
  const { t, i18n } = useTranslation()
  const { locale } = useLocale()
  const { prealert, isLoading, error, refetch } = usePrealert(id)
  const { emails, isLoading: emailsLoading } = usePrealertEmails(id)
  const { events, isLoading: eventsLoading } = usePrealertEvents(id)

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !prealert) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-72" /><Skeleton className="h-40 w-full rounded-xl" /></div>

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link to={`/${locale}/dashboard/credits/dashboard?tab=prealerts`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t('credits.common.backPrealerts')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('credits.prealerts.detail.title', { id: prealert.id })}</h1>
          <PreAlertStatusBadge status={prealert.status} />
          <WhsChip whs={prealert.whs} />
          <span className="text-sm text-muted-foreground">{prealert.company_name} · PO {prealert.po_display ?? '—'} · JD {prealert.jd}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('credits.prealerts.detail.filedBy')} {prealert.qa_inspector ?? prealert.created_by_email ?? '—'} · {formatDateTime(prealert.created_at, i18n.language)}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-sm">
            {prealert.credit_id ? (
              <Link to={`/${locale}/dashboard/credits/credit?id=${prealert.credit_id}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                <ExternalLink className="size-4" /> {t('credits.prealerts.detail.openCredit', { id: prealert.credit_id })}
              </Link>
            ) : (
              <span className="text-muted-foreground">{t('credits.prealerts.detail.noCredit')}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <PreviewPrealertEmailLink prealert={prealert} />
            <ResendPrealertButton prealert={prealert} />
            <DismissOrReopenPrealertButton prealert={prealert} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('credits.detail.header')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label={t('credits.detail.date')} value={formatDate(prealert.report_date, i18n.language)} />
          <Fact label={t('credits.detail.po')} value={prealert.po_display} />
          <Fact label={t('credits.detail.awb')} value={prealert.awb} />
          <Fact label={t('credits.detail.flight')} value={prealert.flight} />
          <Fact label={t('credits.detail.arrival')} value={prealert.arrival_time} />
          <Fact label={t('credits.detail.qa')} value={prealert.qa_inspector} />
          {prealert.notes && <div className="col-span-full"><Fact label={t('credits.prealerts.detail.notes')} value={<span className="whitespace-pre-wrap">{prealert.notes}</span>} /></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('credits.prealerts.detail.items')}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>{t('credits.lines.product')}</th>
                <th>{t('credits.lines.finLoose')}</th>
                <th className="text-right!">{t('credits.prealerts.detail.qtyRecv')}</th>
                <th className="text-right!">{t('credits.prealerts.detail.pct')}</th>
                <th className="text-right!">{t('credits.prealerts.detail.temp')}</th>
                <th>{t('credits.lines.flags')}</th>
                <th>{t('credits.prealerts.detail.description')}</th>
              </tr>
            </thead>
            <tbody>
              {prealert.items.map((it) => (
                <tr key={it.id} className="border-t border-border align-top">
                  <td className="px-2 py-2 font-medium">{it.product_name}{it.code && <span className="ml-1 text-xs text-muted-foreground">({it.code})</span>}</td>
                  <td className="px-2 py-2">{it.finished_or_loose ?? '—'}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">{formatQty(it.qty_received)} {it.qty_unit ?? ''}</td>
                  <td className="px-2 py-2 text-right">{it.problem_pct === null ? '—' : <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-xs font-semibold text-destructive">{formatQty(it.problem_pct, 0)}%</span>}</td>
                  <td className="px-2 py-2 text-right font-mono tabular-nums">{it.temperature ?? '—'}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {FLAG_KEYS.filter((f) => it[f]).map((f) => <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{t(`credits.flags.${FLAG_LABEL_KEY[f]}`)}</span>)}
                      {!FLAG_KEYS.some((f) => it[f]) && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="max-w-md whitespace-pre-wrap px-2 py-2 text-muted-foreground">{it.description ?? it.observations ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('credits.photos.title')}</CardTitle></CardHeader>
        <CardContent><CreditPhotoGallery photos={prealert.photos} urlFor={(p) => prealertPhotoUrl(prealert.id, p.filename)} /></CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('credits.prealerts.detail.email')}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {prealert.notified_at ? <>{t('credits.prealerts.detail.sentAt')} {formatDateTime(prealert.notified_at, i18n.language)}</> : t('credits.prealerts.detail.notSent')}
            </p>
            <CreditEmailLog emails={emails} loading={emailsLoading} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('credits.history.title')}</CardTitle></CardHeader>
          <CardContent><CreditAuditLog events={events} loading={eventsLoading} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
