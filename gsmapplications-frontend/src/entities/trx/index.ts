// Public API de la entidad TRX (contrato de config dirigido por datos).
export type {
  ApiEnvelope,
  TrxItem,
  TrxConfig,
  TrxAttribute,
  ParamSource,
  ResourceParameter,
  Resource,
  ReaConfig,
} from './model/types'

// Motor: resuelve resources (cache IndexedDB) y produce filas para la UI.
export { useTrxData } from './model/useTrxData'
export { resolveResource, resolveItemValue } from './model/engine'
export type { Context, Fetcher } from './model/engine'
