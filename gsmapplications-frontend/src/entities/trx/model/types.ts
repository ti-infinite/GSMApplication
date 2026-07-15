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
  selectorValue:  string   // campo/path de cada fila ($.data/consumption | consumption)
  selectorType?:  'JSON_PATH' | 'FIELD' | 'COMPUTED'
  source?:        string   // resource del que sale (multi-resource); default: el principal
  sourceType?:    'INDEXED_DB' | 'API' | 'MEMORY' | 'STATIC'   // de dónde lee el item (cache…)
  computed?:      string   // id de un computed en el registry (cuando selectorType = COMPUTED)
  renderer?:      string   // id de un cell renderer en el registry (badge, input…)
}

export interface TrxConfig {
  trxAttributes: TrxAttribute[]
  items:         TrxItem[]
  events:        string[]
}

/** Acción (botón) — el motor la dibuja y delega la lógica al registry. */
export interface TrxAttribute {
  id:                 string
  label:              string
  type?:              'SIMPLE' | 'CUSTOM' | 'STEPPED'
  action?:            string   // id de un action handler en el registry
  variant?:           'default' | 'secondary' | 'ghost'
  disabledWhenEmpty?: boolean  // deshabilitar si la tabla no tiene filas
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
  endpoint?:   string    // ruta del backend → el fetcher genérico la usa (N rutas, N endpoints)
  cacheIn?:    'INDEXED_DB'
  parameters:  ResourceParameter[]
}

export interface ReaConfig {
  resources: Resource[]
  events:    string[]
  agents:    unknown[]
}
