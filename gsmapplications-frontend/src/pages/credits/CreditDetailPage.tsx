import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useLocale } from '@/shared/hooks/useLocale'
import { CreditDetail } from '@/widgets/CreditDetail'

// /dashboard/credits/credit?id=N  (also the target of the "Review credit" link in the purchasing e-mail)
export default function CreditDetailPage() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const [params] = useSearchParams()
  const id = Number(params.get('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('credits.common.missingId')}</p>
        <Link to={`/${locale}/dashboard/credits/dashboard`} className="text-sm text-primary hover:underline">{t('credits.common.back')}</Link>
      </div>
    )
  }
  return <CreditDetail key={id} id={id} />
}
