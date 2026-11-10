import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useSaveCreditSupplier, type CreditSupplier } from '@/entities/creditSupplier'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  /** `null` = create; a supplier = edit; `undefined` = closed. */
  supplier: CreditSupplier | null | undefined
  onClose: () => void
}

export function SupplierFormDialog({ supplier, onClose }: Props) {
  const { t } = useTranslation()
  const save = useSaveCreditSupplier()
  const [name, setName] = useState('')
  const [emails, setEmails] = useState('')
  const [notes, setNotes] = useState('')
  const open = supplier !== undefined

  useEffect(() => {
    setName(supplier?.name ?? '')
    setEmails(supplier?.emails.join(', ') ?? '')
    setNotes(supplier?.notes ?? '')
  }, [supplier])

  const list = emails.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
  const invalid = list.find((e) => !EMAIL_RE.test(e))
  const nameError = name.trim() ? null : t('credits.suppliers.nameRequired')

  async function submit() {
    if (nameError || invalid) return
    try {
      await save.mutateAsync({ id: supplier?.id ?? null, body: { name: name.trim(), emails: Array.from(new Set(list)), notes: notes.trim() || null } })
      toast.success(t('credits.suppliers.saved'))
      onClose()
    } catch (e) {
      toast.error(t('credits.decision.failed'), { description: (e as Error).message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? t('credits.suppliers.editTitle') : t('credits.suppliers.addTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 py-2">
          <Field label={t('credits.suppliers.name')} error={name !== '' ? nameError : null}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label={`${t('credits.suppliers.emails')} (${t('credits.suppliers.emailsHint')})`} error={invalid ? t('credits.suppliers.invalidEmail', { email: invalid }) : null}>
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ar@supplier.com, credits@supplier.com" />
          </Field>
          <Field label={t('credits.suppliers.notes')}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter className="px-6 pb-4">
          <Button type="button" variant="outline" onClick={onClose}>{t('credits.common.cancel')}</Button>
          <Button type="button" onClick={submit} disabled={save.isPending || !!nameError || !!invalid}>{t('credits.common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
