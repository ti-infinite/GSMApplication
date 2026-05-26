import type { ComponentType } from 'react'
import IframeRenderer from './renderers/IframeRenderer'
import NewTabRenderer from './renderers/NewTabRenderer'
import NhBiRenderer   from './renderers/NhBiRenderer'

export type ExternalRendererProps = {
  url:    string
  title?: string
}

const renderers: Record<string, ComponentType<ExternalRendererProps>> = {
  'iframe': IframeRenderer,
  'newtab': NewTabRenderer,
  'nhbi':   NhBiRenderer,
}

type Props = {
  url:         string
  activeType?: string | null
  title?:      string
}

export default function ExternalPage({ url, activeType, title }: Props) {
  const Renderer = renderers[activeType ?? 'iframe'] ?? IframeRenderer

  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
      )}
      <Renderer url={url} title={title} />
    </div>
  )
}
