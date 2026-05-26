import { useBiEmbed } from '@/shared/hooks/useBiEmbed'
import type { ExternalRendererProps } from '../ExternalPage'

export default function NhBiRenderer({ url, title }: ExternalRendererProps) {
  const state = useBiEmbed(url)

  if (state.status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando reporte...
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Error al cargar el reporte: {state.message}
      </div>
    )
  }

  return (
    <iframe
      src={state.embedUrl}
      title={title}
      className="flex-1 border-0"
      allow="fullscreen"
    />
  )
}