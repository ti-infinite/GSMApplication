import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ExternalRendererProps } from '../ExternalPage'

export default function NewTabRenderer({ url, title }: ExternalRendererProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <ExternalLink className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{t('newtab.description')}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <ExternalLink className="h-4 w-4" />
        {t('newtab.open')}
      </a>
    </div>
  )
}
