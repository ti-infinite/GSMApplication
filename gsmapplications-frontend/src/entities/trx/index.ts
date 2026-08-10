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
export { useTrxConfig } from './model/useTrxConfig'
export { resolveResource, resolveItemValue, httpFetcher } from './model/engine'
export { DEFAULT_SELECTORS } from './model/selectors'
export { buildRegistry, DEFAULT_RENDERERS, DEFAULT_GUARDS, DEFAULT_ACTIONS } from './registry'
export { pivotAttributes } from './model/attributes'
export { formatMoney } from './model/money'
export type { Context, Fetcher } from './model/engine'
export type { TrxAttrPair } from './model/attributes'

// Runtime declarativo: renderiza un módulo entero desde su ModuleConfig.
export { TrxRuntime } from './ui/TrxRuntime'
export { TrxModule } from './ui/TrxModule'
export type {
  JsonConfig,
  FrontConfig,
  FilterConfig,
  CollectionSection,
  WorkflowConfig,
  WfTransition,
  WfButton,
  ComponentNode,
  TableSection,
  TrxField,
  RuntimeCtx,
  GuardCtx,
  TrxRegistry,
  CellRenderCtx,
  ActionCtx,
  CollectionApi,
} from './model/runtime'
