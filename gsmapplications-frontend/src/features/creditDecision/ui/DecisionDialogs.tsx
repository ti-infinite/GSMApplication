import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { useApproveCredit, useDenyCredit, type Credit } from '@/entities/credit'

// Approve / Deny with a confirmation dialog each; the server records who decided.
export function ApproveCreditButton({ credit, disabled }: { credit: Credit; disabled?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const approve = useApproveCredit()
  const isReapprove = credit.status === 'denied'
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={disabled || approve.isPending}>
        {isReapprove ? t('credits.decision.reapprove') : t('credits.decision.approve')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('credits.decision.approveTitle', { id: credit.id })}</DialogTitle>
            <DialogDescription>{t('credits.decision.approveBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 pb-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('credits.common.cancel')}</Button>
            <Button
              type="button"
              disabled={approve.isPending}
              onClick={async () => {
                try {
                  await approve.mutateAsync(credit.id)
                  toast.success(t('credits.decision.approved'))
                  setOpen(false)
                } catch (e) {
                  toast.error(t('credits.decision.failed'), { description: (e as Error).message })
                }
              }}
            >
              {t('credits.decision.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DenyCreditButton({ credit, disabled }: { credit: Credit; disabled?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const deny = useDenyCredit()
  return (
    <>
      <Button type="button" variant="outline" className="text-destructive" onClick={() => setOpen(true)} disabled={disabled || deny.isPending}>
        {t('credits.decision.deny')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('credits.decision.denyTitle', { id: credit.id })}</DialogTitle>
            <DialogDescription>{t('credits.decision.denyBody')}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <Field label={t('credits.decision.denyReason')}>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
          </div>
          <DialogFooter className="px-6 pb-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('credits.common.cancel')}</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deny.isPending}
              onClick={async () => {
                try {
                  await deny.mutateAsync({ id: credit.id, reason: reason.trim() || null })
                  toast.success(t('credits.decision.denied'))
                  setOpen(false)
                } catch (e) {
                  toast.error(t('credits.decision.failed'), { description: (e as Error).message })
                }
              }}
            >
              {t('credits.decision.deny')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
