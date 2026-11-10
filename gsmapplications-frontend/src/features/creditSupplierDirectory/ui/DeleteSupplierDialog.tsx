import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useDeleteCreditSupplier, type CreditSupplier } from '@/entities/creditSupplier'

export function DeleteSupplierDialog({ supplier, onClose }: { supplier: CreditSupplier | null; onClose: () => void }) {
  const { t } = useTranslation()
  const remove = useDeleteCreditSupplier()
  return (
    <Dialog open={supplier !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('credits.suppliers.deleteTitle', { name: supplier?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('credits.suppliers.deleteBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="px-6 pb-4">
          <Button type="button" variant="outline" onClick={onClose}>{t('credits.common.cancel')}</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={async () => {
              if (!supplier) return
              try {
                await remove.mutateAsync(supplier.id)
                toast.success(t('credits.suppliers.deleted'))
                onClose()
              } catch (e) {
                toast.error(t('credits.decision.failed'), { description: (e as Error).message })
              }
            }}
          >
            {t('credits.common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
