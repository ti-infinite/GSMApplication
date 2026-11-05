import { useCallback, useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getConfig, saveConfig } from '@/shared/lib/idb'
import { getFilteredTrxDefinitions } from '@/shared/api/operations/endpoints'
import type { TrxDefinitionDTOListApiResponse } from '@/shared/api/operations/model'
import type { JsonConfig } from './runtime'
import { staleWhileRevalidate } from './swr'

async function fetchConfig(prefix: string): Promise<JsonConfig> {
  const res = await getFilteredTrxDefinitions({ trxPrefix: prefix })
  const def = (res.data as TrxDefinitionDTOListApiResponse | undefined)?.data?.[0]
  if (!def?.jsonFront) throw new Error(`Sin definición para "${prefix}"`)
  return {
    prefix:       def.prefix ?? prefix,
    JsonFront:    JSON.parse(def.jsonFront),
    JsonREA:      JSON.parse(def.jsonRea ?? '{}'),
    JsonWorkflow: JSON.parse(def.jsonWorkflow ?? '{}'),
  }
}

/**
 * Carga el JsonConfig de un módulo por `prefix`, con estrategia SWR:
 *  1) muestra el cacheado (IndexedDB) al instante → shell sin espera de red;
 *  2) revalida en background contra el backend → actualiza si cambió.
 */
export function useTrxConfig(prefix: string) {
  const { t } = useTranslation(undefined, { keyPrefix: 'trx' })
  const [config, setConfig] = useState<JsonConfig | null>(null)
  const [error,  setError]  = useState<unknown>(null)

  const load = useCallback(() => {
    setError(null)
    const key = `${Cookies.get('gsm_company') ?? ''}::${prefix}`
    const logFailure = (e: unknown) => console.error(`[${prefix}] no se pudo traer la definición del backend`, e)

    staleWhileRevalidate({
      read:    () => getConfig<JsonConfig>(key),
      fetch:   () => fetchConfig(prefix),
      save:    fresh => saveConfig(key, fresh, 'operations'),
      onFresh: setConfig,
      onError: e => {
        logFailure(e)
        toast.warning(t('staleData'), { id: `trx-stale-config-${prefix}` })
      },
    })
      .then(setConfig)
      .catch(e => { logFailure(e); setError(e) })
  }, [prefix, t])

  useEffect(() => { load() }, [load])

  return { config, error, reload: load }
}
