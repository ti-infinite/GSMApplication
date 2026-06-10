import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

export default function NotFound() {
  const { t } = useTranslation()
  const { locale = 'en' } = useParams<{ locale: string }>()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-7xl font-black leading-none text-primary/15">404</p>
      <Compass className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold text-foreground">{t('notFound.title')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('notFound.message')}</p>
      <Link
        to={`/${locale}/dashboard`}
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('notFound.back')}
      </Link>
    </div>
  )
}