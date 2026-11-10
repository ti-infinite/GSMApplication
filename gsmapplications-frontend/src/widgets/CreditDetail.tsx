import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Undo2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/components/ErrorState'
import { useLocale } from '@/shared/hooks/useLocale'
import {
  creditPhotoUrl, draftFromCredit, draftToUpdate, formatDate, formatDateTime, formatMoney, formatQty, isDraftDirty,
  useCredit, useCreditEmails, useCreditEvents, useUpdateCredit, validateDraft, type CreditDraft, type DraftProblem,
} from '@/entities/credit'
import { CreditHeaderForm } from '@/features/creditHeaderEditor'
import { CreditLinesEditor } from '@/features/creditLinesEditor'
import { ApproveCreditButton, DenyCreditButton } from '@/features/creditDecision'
import { DocumentButtons } from '@/features/creditDocuments'
import { SendEmailDialog } from '@/features/creditSendEmail'
import { PoCostPanel } from '@/features/creditPoCost'
import { CreditStatusBadge, WhsChip } from './CreditStatusBadge'
import { CreditPhotoGallery } from './CreditPhotoGallery'
import { CreditAuditLog } from './CreditAuditLog'
import { CreditEmailLog } from './CreditEmailLog'

function problemMessage(t: (k: string, o?: Record<string, unknown>) => string, p: DraftProblem): string {
  const line = t('credits.history.line', { n: p.line })
  const text = p.code === 'notANumber' ? `${t(`credits.history.field.${p.field}`)}: ${t('credits.lines.yieldRange')}` : t(`credits.lines.${p.code}`)
  return `${line}: ${text}`
}

// One credit, fully editable in place (header + every line), with the decision bar, documents,
// e-mail sending, PO cost, photos, e-mail log and the audit history. A sticky bar appears while
// there are unsaved edits; saving sends the whole credit and the server recomputes the totals.
export function CreditDetail({ id }: { id: number }) {
  const { t, i18n } = useTranslation()
  const { locale } = useLocale()
  const { credit, isLoading, error, refetch } = useCredit(id)
  const { events, isLoading: eventsLoading } = useCreditEvents(id)
  const { emails, isLoading: emailsLoading } = useCreditEmails(id)
  const update = useUpdateCredit()
  const [draft, setDraft] = useState<CreditDraft | null>(null)
  const [showProblems, setShowProblems] = useState(false)

  const base = useMemo(() => (credit ? draftFromCredit(credit) : null), [credit])
  // Re-seed the form whenever the server copy changes and nothing is being edited.
  useEffect(() => {
    if (base && (!draft || !isDraftDirty(draft, draftFromCredit(credit!)))) setDraft(base)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base])

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !credit || !draft || !base) {
    return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-72" /><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div>
  }

  const dirty = isDraftDirty(draft, base)
  const problems = validateDraft(draft)
  const totals = {
    qty: credit.total_qty_credit,
    usable: credit.line_items.reduce((s, l) => s + (l.usable_qty ?? 0), 0),
    usd: credit.total_credit_cost,
  }

  async function saveDraft() {
    if (!draft) return
    if (problems.length > 0) { setShowProblems(true); return }
    try {
      await update.mutateAsync({ id: credit!.id, body: draftToUpdate(draft) })
      setShowProblems(false)
      toast.success(t('credits.detail.saved'))
    } catch (e) {
      toast.error(t('credits.detail.saveFailed'), { description: (e as Error).message })
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
        <Link to={`/${locale}/dashboard/credits/dashboard`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t('credits.common.back')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('credits.detail.title', { id: credit.id })}</h1>
          <CreditStatusBadge status={credit.status} />
          <WhsChip whs={credit.whs} />
          <span className="text-sm text-muted-foreground">{credit.company_name} · PO {credit.po_display ?? '—'} · JD {credit.jd ?? '—'}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('credits.detail.submitted')} {formatDateTime(credit.created_at, i18n.language)}
          {credit.created_by_email && <> {t('credits.detail.by')} {credit.created_by_email}</>}
          {credit.prealert_id && (
            <> · <Link to={`/${locale}/dashboard/credits/prealert?id=${credit.prealert_id}`} className="text-primary hover:underline">{t('credits.detail.fromPrealert', { id: credit.prealert_id })}</Link></>
          )}
        </p>
      </div>

      {/* Decision bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-sm">
            {credit.status === 'pending' && <span className="text-muted-foreground">{t('credits.decision.pending')}</span>}
            {credit.status === 'approved' && <span className="font-medium text-success">{t('credits.decision.approvedOn', { date: formatDateTime(credit.decided_at, i18n.language) })}</span>}
            {credit.status === 'denied' && (
              <span className="text-destructive">
                {t('credits.decision.deniedOn', { date: formatDateTime(credit.decided_at, i18n.language) })}
                {credit.denial_reason && <span className="text-muted-foreground"> · {t('credits.decision.deniedReason')}: {credit.denial_reason}</span>}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {credit.status !== 'denied' && <DenyCreditButton credit={credit} disabled={dirty} />}
            {credit.status !== 'approved' && <ApproveCreditButton credit={credit} disabled={dirty} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('credits.detail.header')}</CardTitle>
          <CardDescription>{t('credits.detail.editHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreditHeaderForm header={draft.header} onChange={(header) => setDraft({ ...draft, header })} disabled={update.isPending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t('credits.lines.title')}</CardTitle>
            <CardDescription>
              {t('credits.lines.totals')}: {formatQty(totals.qty)} {t('credits.lines.qtyCredit').toLowerCase()} · {formatQty(totals.usable)} {t('credits.lines.usable').toLowerCase()} · <b className="text-foreground">{formatMoney(totals.usd)}</b>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <CreditLinesEditor lines={draft.lines} onChange={(lines) => setDraft({ ...draft, lines })} problems={showProblems ? problems : []} disabled={update.isPending} />
          {showProblems && problems.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-destructive">
              {problems.map((p, i) => <li key={i}>{problemMessage(t, p)}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('credits.docs.title')}</CardTitle></CardHeader>
          <CardContent><DocumentButtons credit={credit} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('credits.send.title')}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div><SendEmailDialog credit={credit} /></div>
            <CreditEmailLog emails={emails} loading={emailsLoading} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('credits.poCost.title')}</CardTitle></CardHeader>
        <CardContent><PoCostPanel key={`${credit.id}-${credit.updated_at}`} credit={credit} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('credits.photos.title')}</CardTitle></CardHeader>
        <CardContent><CreditPhotoGallery photos={credit.photos} urlFor={(p) => creditPhotoUrl(credit.id, p.filename)} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('credits.history.title')}</CardTitle></CardHeader>
        <CardContent><CreditAuditLog events={events} loading={eventsLoading} /></CardContent>
      </Card>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 py-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-warning">{t('credits.detail.unsaved')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setDraft(base); setShowProblems(false) }} disabled={update.isPending}>
                <Undo2 /> {t('credits.detail.discard')}
              </Button>
              <Button type="button" onClick={saveDraft} disabled={update.isPending}>
                <Save /> {update.isPending ? t('credits.common.saving') : t('credits.common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <p className="sr-only">{formatDate(credit.report_date, i18n.language)}</p>
    </div>
  )
}
