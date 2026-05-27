import type { ExternalRendererProps } from '../ExternalPage'

export default function IframeRenderer({ url, title }: ExternalRendererProps) {
  return (
    <iframe
      src={url}
      title={title}
      className="flex-1 border-0"
      allow="fullscreen"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  )
}