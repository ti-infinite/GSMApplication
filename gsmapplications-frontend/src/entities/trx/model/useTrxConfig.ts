import { useCallback, useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { getConfig, saveConfig } from '@/shared/lib/idb'
import { getFilteredTrxDefinitions } from '@/shared/api/operations/endpoints'
import type { TrxDefinitionDTOListApiResponse } from '@/shared/api/operations/model'
import type { JsonConfig } from './runtime'

/**
 * Carga el JsonConfig de un módulo por `prefix`, con estrategia SWR:
 *  1) muestra el cacheado (IndexedDB) al instante → shell sin espera de red;
 *  2) revalida en background contra el backend → actualiza si cambió.
 * La key incluye el tenant (companyId) porque el config es por empresa e IndexedDB
 * es por navegador (compartido entre tenants). Genérico → sirve para las N TRX.
 */
export function useTrxConfig(prefix: string) {
  const [config, setConfig] = useState<JsonConfig | null>(null)
  const [error,  setError]  = useState<unknown>(null)

  const load = useCallback(() => {
    setError(null)
    const key = `${Cookies.get('gsm_company') ?? ''}::${prefix}`
    void (async () => {
      // (1) cache → shell instantáneo (si ya se visitó este módulo con este tenant).
      const cached = await getConfig<JsonConfig>(key)
      if (cached) setConfig(cached)

      // (2) revalida contra el backend; guarda + actualiza si difiere.
      try {
        const res = await getFilteredTrxDefinitions({ trxPrefix: prefix })
        const def = (res.data as TrxDefinitionDTOListApiResponse | undefined)?.data?.[0]
        if (!def?.jsonFront) throw new Error(`Sin definición para "${prefix}"`)
        const fresh: JsonConfig = {
          prefix:       def.prefix ?? prefix,
          JsonFront:    JSON.parse(def.jsonFront),
          JsonREA:      JSON.parse(def.jsonRea ?? '{}'),
          JsonWorkflow: JSON.parse(def.jsonWorkflow ?? '{}'),
        }
        await saveConfig(key, fresh, 'operations')
        setConfig(fresh)
      } catch (e) {
        console.error(`[${prefix}] no se pudo traer la definición del backend`, e)
        if (!cached) setError(e)   // solo error si no había cache que mostrar
      }
    })()
  }, [prefix])

  useEffect(() => { load() }, [load])

  return { config, error, reload: load }
}
