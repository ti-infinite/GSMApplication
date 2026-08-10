import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/skeleton'
import { ErrorState } from '@/shared/components/ErrorState'
import { useTrxConfig } from '../model/useTrxConfig'
import { TrxRuntime } from './TrxRuntime'
import type { TrxRegistry } from '../model/runtime'

/**
 * Wrapper de un módulo TRX: carga el config (SWR) y maneja los 3 estados con el HEADER
 * siempre visible (frame estable estilo App Shell). Deja las páginas en una línea.
 *   • config OK      → TrxRuntime (template real, con su propio header + contenido)
 *   • config cargando → header + skeleton genérico (raro: 1ª vez; el SWR lo cachea)
 *   • config falla    → header + ErrorState (contenido, NO toma toda la pantalla)
 * El error de DATA (LOADCS) se maneja adentro, inline en la tabla.
 */
export function TrxModule({ prefix, registry, title, subtitle, heading, headingBadge, trxLabel }: {
  prefix:    string
  registry:  TrxRegistry
  title?:    string
  subtitle?: string
  heading?:  string
  // Id de un computed (registry.computeds) que arma un total/conteo visible junto al heading —
  // ej. total de la orden en OCM/Factura. Opcional, no toca el JSON del módulo.
  headingBadge?: string
  trxLabel?: string
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'trx' })
  const { config, error, reload } = useTrxConfig(prefix)

  // Config OK → el template real. TrxRuntime pinta su propio header + el contenido.
  if (config) {
    return <TrxRuntime config={config} registry={registry} title={title} subtitle={subtitle} heading={heading} headingBadge={headingBadge} trxLabel={trxLabel} />
  }

  // Cargando / error → header SIEMPRE visible; el estado va en la zona de contenido.
  return (
    <div className="flex flex-col gap-6">
      <div>
        {title && <h1 className="text-2xl font-bold text-foreground">{t(title)}</h1>}
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{t(subtitle)}</p>}
      </div>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      )}
    </div>
  )
}
