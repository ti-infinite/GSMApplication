import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Eye, Send } from 'lucide-react'
import { Button, buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { Combobox } from '@/shared/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { creditEmailPreviewUrl, useEmailSettings, useSendCredit, type Credit, type EmailLanguage } from '@/entities/credit'
import { useCreditSuppliers } from '@/entities/creditSupplier'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

// Sends the approved credit note (supplier PDF + Excel) to a supplier from the directory and/or
// extra addresses, with an optional message. The directory entry whose name matches the credit's
// company is pre-selected.
export function SendEmailDialog({ credit }: { credit: Credit }) {
  const { t, i18n } = useTranslation()
  const { suppliers } = useCreditSuppliers()
  const send = useSendCredit()
  const emailSettings = useEmailSettings()
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState<string>('')
  const [extra, setExtra] = useState('')
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState<EmailLanguage>('en')
  const locked = credit.status !== 'approved'

  const options = useMemo(
    () => suppliers.map((s) => ({ value: String(s.id), label: s.name, description: s.emails.join(', ') || t('credits.suppliers.noEmails') })),
    [suppliers, t]
  )
  const supplier = suppliers.find((s) => String(s.id) === supplierId) ?? null
  const extraEmails = extra.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean)
  const invalid = extraEmails.find((e) => !EMAIL_RE.test(e))
  const recipients = [...(supplier?.emails ?? []), ...extraEmails.filter((e) => !(supplier?.emails ?? []).includes(e))]

  function openDialog() {
    const match = suppliers.find((s) => normalize(s.name) === normalize(credit.company_name))
    setSupplierId(match ? String(match.id) : '')
    setExtra('')
    setMessage('')
    setLanguage(i18n.language.startsWith('es') ? 'es' : 'en')
    setOpen(true)
  }

  async function submit() {
    if (invalid) return toast.error(t('credits.send.invalidEmail', { email: invalid }))
    if (recipients.length === 0) return toast.error(t('credits.send.noRecipients'))
    try {
      const result = await send.mutateAsync({
        id: credit.id,
        body: { supplier_id: supplier?.id ?? null, emails: extraEmails, message: message.trim() || null, language },
      })
      if (result.email_enabled) toast.success(t('credits.send.sent', { count: result.recipients.length }))
      else toast.warning(t('credits.send.loggedOnly'))
      setOpen(false)
    } catch (e) {
      toast.error(t('credits.send.failed'), { description: (e as Error).message })
    }
  }

  return (
    <>
      <Button type="button" onClick={openDialog} disabled={locked}>
        <Send /> {t('credits.send.button')}
      </Button>
      {locked && <p className="mt-2 text-xs text-muted-foreground">{t('credits.send.locked')}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('credits.send.title')}</DialogTitle>
            <DialogDescription>
              {t('credits.send.attachments')}
              {emailSettings?.cc_on_supplier_send && <> · {t('credits.send.cc', { email: emailSettings.cc_on_supplier_send })}</>}
            </DialogDescription>
          </DialogHeader>
          {emailSettings?.redirect_to && (
            <p className="mx-6 mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              {t('credits.send.testMode', { email: emailSettings.redirect_to })}
            </p>
          )}
          {emailSettings && !emailSettings.email_enabled && !emailSettings.redirect_to && (
            <p className="mx-6 mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{t('credits.send.loggedOnly')}</p>
          )}
          <div className="flex flex-col gap-4 px-6 py-2">
            <Field label={t('credits.send.supplier')}>
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('credits.send.noSuppliers')}</p>
              ) : (
                <Combobox options={options} value={supplierId} onChange={setSupplierId} placeholder={t('credits.send.pickSupplier')} emptyMessage={t('credits.suppliers.empty')} />
              )}
            </Field>
            <Field label={`${t('credits.send.extra')} (${t('credits.send.extraHint')})`} error={invalid ? t('credits.send.invalidEmail', { email: invalid }) : null}>
              <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="ar@supplier.com, credits@supplier.com" />
            </Field>
            <Field label={t('credits.send.language')}>
              <div className="flex h-8 w-fit overflow-hidden rounded-lg border border-input text-xs font-medium">
                {(['en', 'es'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={language === l}
                    onClick={() => setLanguage(l)}
                    className={language === l ? 'bg-primary px-3 text-primary-foreground' : 'px-3 text-muted-foreground hover:bg-muted'}
                  >
                    {t(`credits.send.lang_${l}`)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('credits.send.message')}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('credits.send.recipients')}</p>
              {recipients.length === 0 ? (
                <p className="text-muted-foreground">{t('credits.send.noRecipients')}</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {recipients.map((r) => (
                    <li key={r} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 pb-4 sm:justify-between">
            <a href={creditEmailPreviewUrl(credit.id, language, message)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'ghost' }))}>
              <Eye /> {t('credits.send.preview')}
            </a>
            <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('credits.common.cancel')}</Button>
            <Button type="button" onClick={submit} disabled={send.isPending || recipients.length === 0 || !!invalid}>
              <Send /> {send.isPending ? t('credits.send.sending') : t('credits.send.button')}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
