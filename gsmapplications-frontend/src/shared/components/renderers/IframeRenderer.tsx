import { ExternalLink } from 'lucide-react'
import type { ExternalRendererProps } from '../ExternalPage'

export default function IframeRenderer({ url, title }: ExternalRendererProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 shrink-0 rounded-md border border-primary/20 bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
          title="Abrir en nueva pestaña"
        >
          <ExternalLink className="h-3.5 w-3.5" />
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