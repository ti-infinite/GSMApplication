import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <Construction className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{t('comingSoon.message')}</p>
    </div>
  )
}
