import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ExternalRendererProps } from '../ExternalPage'

export default function IframeRenderer({ url, title }: ExternalRendererProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('common.openInNewTab')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/20"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('common.openInNewTab')}</span>
        </a>
      </div>
      <iframe
        src={url}
        title={title}
        className="flex-1 border-0"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}