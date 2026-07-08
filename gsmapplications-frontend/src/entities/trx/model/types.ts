// TRX domain — contrato genérico de un módulo dirigido por configuración.
// El backend enviará estos JSON (config del módulo + REA de recursos); el motor
// los interpreta. Nada de esto es específico de un módulo concreto.

/** Envelope estándar del backend. El motor desempaca `data`. */
export interface ApiEnvelope<T> {
  success: string
  message: string
  data:    T
  traceId: string | null
}

// ── TRX config (qué muestra / qué hace el módulo) ──────────────────

/** Un item = una columna: qué campo de la data se muestra. */
export interface TrxItem {
  descr:          string   // etiqueta de la columna
  selectorValue:  string   // campo/path de cada fila
  selectorType?:  'JSON_PATH' | 'FIELD'
}

export interface TrxConfig {
  trxAttributes: TrxAttribute[]
  items:         TrxItem[]
  events:        string[]
}

/** Acción (botón) — se detalla más adelante. */
export interface TrxAttribute {
  id:     string
  label:  string
  type:   'SIMPLE' | 'CUSTOM' | 'STEPPED'
}

// ── REA config (de dónde salen los datos) ──────────────────────────

export type ParamSource = 'COOKIE' | 'CONTEXT' | 'ROW' | 'INPUT' | 'STATIC'

export interface ResourceParameter {
  key:         string
  sourceType:  ParamSource
  cookieName?: string
  keyValue?:   string
  valueType?:  string
}

export interface Resource {
  id:          string
  descr:       string
  sourceType:  'API' | 'INDEXED_DB' | 'MEMORY' | 'STATIC'
  cacheIn?:    'INDEXED_DB'
  parameters:  ResourceParameter[]
}

export interface ReaConfig {
  resources: Resource[]
  events:    string[]
  agents:    unknown[]
}
