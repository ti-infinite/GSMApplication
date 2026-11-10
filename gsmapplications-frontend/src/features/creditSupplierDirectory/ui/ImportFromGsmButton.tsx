import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useImportGsmSuppliers } from '@/entities/creditSupplier'

// Pulls GSM's supplier master into the directory (names + the one e-mail each carries).
export function ImportFromGsmButton() {
  const { t } = useTranslation()
  const importGsm = useImportGsmSuppliers()
  return (
    <Button
      type="button"
      variant="outline"
      disabled={importGsm.isPending}
      onClick={async () => {
        try {
          const r = await importGsm.mutateAsync()
          toast.success(t('credits.suppliers.imported', { created: r.created, updated: r.updated }))
        } catch (e) {
          toast.error(t('credits.suppliers.importFailed'), { description: (e as Error).message })
        }
      }}
    >
      <Download /> {importGsm.isPending ? t('credits.suppliers.importing') : t('credits.suppliers.import')}
    </Button>
  )
}
