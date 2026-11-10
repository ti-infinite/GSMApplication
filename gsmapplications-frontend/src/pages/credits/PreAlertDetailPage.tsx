import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useLocale } from '@/shared/hooks/useLocale'
import { PreAlertDetail } from '@/widgets/PreAlertDetail'

// /dashboard/credits/prealert?id=N  (target of the "Ver pre-alerta" link in the warehouse e-mail)
export default function PreAlertDetailPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [params] = useSearchParams()
  const id = Number(params.get('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('credits.common.missingId')}</p>
        <Link to={`/${locale}/dashboard/credits/dashboard?tab=prealerts`} className="text-sm text-primary hover:underline">{t('credits.common.backPrealerts')}</Link>
      </div>
    )
  }
  return <PreAlertDetail key={id} id={id} />
}
