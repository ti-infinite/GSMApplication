import { useTranslation } from 'react-i18next'
import { TrxDocumentSearch } from '@/entities/trx'
import { getStoredUser } from '@/shared/lib/auth'

export default function ReportsPage() {
  const { t } = useTranslation(undefined, { keyPrefix: 'reports' })
  // Usuario con finca asignada: la ubicación queda fija, igual que en los módulos TRX.
  const assignedLocation = getStoredUser()?.location ?? ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <TrxDocumentSearch initialLocation={assignedLocation} lockLocation={!!assignedLocation} />
    </div>
  )
}
