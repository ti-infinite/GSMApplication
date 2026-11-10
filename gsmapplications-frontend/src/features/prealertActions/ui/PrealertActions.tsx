import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Eye, RotateCcw, Send, XCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { prealertEmailPreviewUrl, useDismissPrealert, useReopenPrealert, useResendPrealert, type PreAlert } from '@/entities/prealert'

const fail = (t: (k: string) => string, e: unknown) => toast.error(t('credits.decision.failed'), { description: (e as Error).message })

export function PreviewPrealertEmailLink({ prealert }: { prealert: PreAlert }) {
  const { t } = useTranslation()
  return (
    <a href={prealertEmailPreviewUrl(prealert.id)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
      <Eye /> {t('credits.prealerts.detail.preview')}
    </a>
  )
}

export function ResendPrealertButton({ prealert }: { prealert: PreAlert }) {
  const { t } = useTranslation()
  const resend = useResendPrealert()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={resend.isPending}
      onClick={async () => {
        try {
          const r = await resend.mutateAsync(prealert.id)
          if (r.email_enabled) toast.success(t('credits.prealerts.detail.resent'))
          else toast.warning(t('credits.send.loggedOnly'))
        } catch (e) {
          fail(t, e)
        }
      }}
    >
      <Send /> {t('credits.prealerts.detail.resend')}
    </Button>
  )
}

export function DismissOrReopenPrealertButton({ prealert }: { prealert: PreAlert }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dismiss = useDismissPrealert()
  const reopen = useReopenPrealert()
  if (prealert.status === 'credited') return null
  if (prealert.status === 'dismissed') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={reopen.isPending}
        onClick={async () => {
          try {
            await reopen.mutateAsync(prealert.id)
            toast.success(t('credits.prealerts.detail.reopened'))
          } catch (e) {
            fail(t, e)
          }
        }}
      >
        <RotateCcw /> {t('credits.prealerts.detail.reopen')}
      </Button>
    )
  }
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <XCircle /> {t('credits.prealerts.detail.dismiss')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('credits.prealerts.detail.dismissTitle', { id: prealert.id })}</DialogTitle>
            <DialogDescription>{t('credits.prealerts.detail.dismissBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 pb-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('credits.common.cancel')}</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={dismiss.isPending}
              onClick={async () => {
                try {
                  await dismiss.mutateAsync(prealert.id)
                  toast.success(t('credits.prealerts.detail.dismissed'))
                  setOpen(false)
                } catch (e) {
                  fail(t, e)
                }
              }}
            >
              {t('credits.prealerts.detail.dismiss')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
