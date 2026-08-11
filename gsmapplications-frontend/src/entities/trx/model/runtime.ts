// Runtime declarativo: el JsonConfig es el objeto UNIFICADO (front + rea + workflow)
// que el motor renderiza. Mapea 1:1 con las columnas JsonFront/JsonREA/JsonWorkflow
// de la tabla TrxDefinition. La lógica no declarable vive en el registry (por id).
import type { ReactNode, Key } from 'react'
import type { TableColumn } from '@/shared/ui/data-table'
import type { Resource, ReaConfig } from './types'
import type { Fetcher } from './engine'
import type { ValueSourceCtx } from './valueSources'

/** Descriptor GENÉRICO de un campo de datos — lo consume CUALQUIER componente
 *  (tabla → columna · card → label-valor · lista → item · KPI → valor). */
/** Descriptor de un campo — formato del backend (solo `descr`→`label`). El motor
 *  lo interpreta genérico; cada atributo es configurable desde el JSON. */
export interface TrxField {
  label?:        string      // etiqueta (header de columna). Omitible (ej. columna de botón)
  selectorValue?: string     // el valor/path a extraer. Omitible si es solo `renderer` (botón)
  selectorType?: string      // cómo se extrae → registry.selectors (default JSON_PATH)
  source?:       string      // id del resource (de cuál dataset)
  sourceType?:   string      // dónde está (INDEXED_DB · API · MEMORY)
  renderer?:     string      // cómo se dibuja el valor → registry.renderers
  sub?:          string      // path acompañante (sub-texto de 2 líneas · clave de tono/estado)
  // ── shorthand del template (el transformer los traduce a renderer/selectorValue) ──
  value?:        string             // alias corto de selectorValue
  unit?:         boolean | string   // → renderer withUnit (true = campo estándar 'measurementUnit')
  input?:        boolean            // → renderer input (editable)
  type?:         string             // control de la celda → renderer (input · checkbox · select · …)
  button?:       string             // botón de celda → renderer (addButton · removeButton · …); key declarativa
  values?:       { value: string; label: string }[]   // opciones INLINE (select/checkbox estáticos, sin source)
  unitType?:     'unit' | 'unitSelect'  // 'unit' = unidad fija · 'unitSelect' = input + dropdown de unidad (guarda en base)
  // NO se declaran acá directo — el template las calcula solas comparando `selectorValue` contra
  // `FrontConfig.validations.sign`/`.negate` (nivel transacción, no por columna: es dato de
  // negocio de la TRX entera, no de dónde se pinta — aplica igual en `products` o en el carrito
  // heredado). Cualquiera de los dos implica que el campo resta stock: deja tipear negativo
  // (`sign`) o guarda negado lo que se tipeó positivo (`negate`) — el input se marca en rojo solo
  // (contra `remaining` de la misma fila). Para que ADEMÁS bloquee confirmar hace falta agregar
  // `STOCK_LIMIT` a `FrontConfig.event` (declaración y activación separadas a propósito).
  sign?:         boolean            // input que permite +/- (ajustes); si no, solo positivos
  negate?:       boolean            // qty: el usuario teclea positivo, se GUARDA negado (ej. gasto: 90 → -90)
  money?:        boolean            // → input de moneda ($ del tenant); guarda número plano, formatea solo display
  sendToTrx?:    boolean            // default true → va en trxProductAttributes. false = columna SOLO-UI (ej. "rejected"), no se manda. Mismo patrón que `addSupply` (opt-out explícito, no hace falta tocar actions.ts por cada columna nueva).
  // NO se declara acá directo — igual que `sign`/`negate`, el template lo calcula comparando
  // `selectorValue` contra `FrontConfig.validations.required` (nivel transacción). Ninguna fila
  // (products o carrito) puede tener este campo vacío para poder confirmar → lo revisa el evento
  // REQUIRED_FIELDS, solo si el módulo lo lista en `event`.
  required?:     boolean
}

/** Un filtro/selector que alimenta el context (params del resource). */
export interface FilterConfig {
  key:            string
  label:          string
  source?:        string   // fetcher de opciones (filtros base; los dependientes no lo usan)
  resource?:      string   // id de un resource (JsonREA) → las opciones salen de ESE resource (params resueltos del context, con gate). Alternativa a `source` (fetcher sin params): sirve para combos que dependen de otros filtros (ej. Requerimiento ← location/origen/destino).
  values?:        { value: string; label: string }[]   // opciones INLINE (combo ESTÁTICO, sin source)
  optionValue:    string
  optionLabel:    string
  cookieDefault?: { field: string }   // default (y bloqueo) desde la cookie del usuario
  dependsOn?:     string   // CASCADA: depende de la selección de otro filtro
  optionsFrom?:   string   // path en la OPCIÓN elegida del padre (ej. "Children")
  input?:         'text' | 'date'   // 'text' = input libre · 'date' = date picker (no combo)
  placeholder?:   string   // placeholder del input/combo
  required?:      boolean  // sin valor, el motor bloquea las transiciones (evento REQUIRED_FILTERS, ver canFire/blockReason)
}

/** Buscador de catálogo del toolbar. Con `cascade` se vuelve un PICKER: botón +
 *  popover con filtros categoría→subcategoría + lista filtrada (como Requirements). */
export interface SearchConfig {
  source:       string
  optionValue?: string
  optionLabel?: string
  placeholder?: string
  label?:       string          // texto del botón trigger (cuando hay cascade)
  cascade?:     FilterConfig[]  // filtros en cascada dentro del popover
  prefixFrom?:  string          // path en la opción elegida → prefijo (ej. AggregatedCode)
  prefixField?: string          // campo del producto a comparar con el prefijo (default 'sku')
}

/** 2ª tabla (carrito/pedido). `target` = balde del payload al enviar (trxProducts…). */
export interface CollectionSection {
  title:    string
  fields:   TrxField[]
  rowKey?:  string
  target?:  string
  display?: 'inline' | 'drawer'   // cómo se muestra el carrito (default: inline)
  trigger?: string                // label del botón que abre el drawer (si display=drawer)
}

/** Multi-select del toolbar → ctx.selections[key] (comparativa de opciones, ej. proveedores). */
export interface SelectConfig { key: string; label: string; source: string; optionValue: string; optionLabel: string }
/** Columnas DERIVADAS de una selección múltiple: 1 col por opción elegida (comparativa). */
export interface DynamicFieldsConfig { from: string; label: string; selector: string; pick?: string }

/** Slot de la tabla principal (template). El transformer lo vuelve un component `table`. */
export interface MainSlot {
  source?:      string
  title?:       string
  placeholder?: string
  rowFilter?:   boolean
  filterBy?:    { field: string; prefixFrom: string }
  search?:      SearchConfig
  addSupply?:   boolean   // false → oculta el picker "cargar insumo" (ej. gasto: se consume del stock, no se agrega)
  select?:      SelectConfig          // multi-select del toolbar (ej. proveedores)
  dynamicFields?: DynamicFieldsConfig  // comparativa: 1 columna por opción elegida
  fields:       TrxField[]
}

/** 2do filtro tipo DOCUMENTO (recepción/OC/factura): recibe la location y lista los
 *  documentos a derivar. El template lo arma; el JSON solo da `source` (+ label). */
export interface DocFilter {
  source:       string
  label?:       string
  optionValue?: string
  optionLabel?: string
  input?:       'text'
}

/** 2do filtro tipo COMBO ESTÁTICO: opciones QUEMADAS en el JSON (sin request).
 *  Con `input:"text"` (sin `values`) es una caja de texto libre en vez de combo. */
export interface ComboFilter {
  type:   'combo'
  key?:   string
  label?: string
  values?: { value: string; label: string }[]
  input?:  'text' | 'date'
  required?: boolean
}

/** 2do filtro tipo COMBO desde RESOURCE: las opciones salen de un resource (JsonREA)
 *  con params resueltos del context + gate (no fetchea hasta que sus params estén). Ej.
 *  Requerimiento ← LOADMISSINGTRX(location, origen, destino). Al elegir, su value entra
 *  al context → dispara el resource principal (líneas). Combo dependiente sin cascada estática. */
export interface ResourceFilter {
  type:     'resource'
  resource: string   // id del resource (JsonREA) que da las opciones
  key?:     string
  label?:   string
  optionValue?: string
  optionLabel?: string
  placeholder?: string
}

/** Un spec de `filter`: keyword ('category'), documento (source), combo estático o combo desde resource. */
export type FilterSpec = string | DocFilter | ComboFilter | ResourceFilter

/** Un attribute de la TRANSACCIÓN (`FrontConfig.trxAttributes`) — no filtra ninguna tabla (eso es
 *  `filter`), es un dato de la transacción misma (documento origen, proveedor, forma de pago…) que
 *  además necesita un control para elegirse. El motor lo renderiza como un filtro más (mismo
 *  FiltersBar, mismo context, mismo gate de resources) Y lo manda 1:1 a `payload.trxAttributes` —
 *  antes la key se declaraba dos veces (una en `filter`, otra en un `trxAttributes: string[]`
 *  aparte); ahora es una sola declaración. Sin `type`: la forma se infiere de qué campos trae —
 *  `resource` → combo de un resource (JsonREA); `source` → combo de un fetcher registrado;
 *  `values` → combo quemado; `input` solo → caja libre/fecha; `compute` → SIN control visible, el
 *  valor lo calcula ese `registry.computeds` (ej. `EmailSupplier` en OCM: lee `$options.idSupplier`,
 *  la opción CRUDA del proveedor elegido — mismo mecanismo que `FrontConfig.derive`/`skuPrefix`,
 *  declarado UNA sola vez acá en vez de repetir la key en un `derive` aparte); nada de eso (solo
 *  `key`) → sin control Y sin cálculo, el valor lo pone otra cosa (ej. heredado por fila de un
 *  documento origen) — solo viaja al payload. */
export interface AttributeSpec {
  key:          string
  label?:       string
  resource?:    string
  source?:      string
  values?:      { value: string; label: string }[]
  input?:       'text' | 'date'
  compute?:     string   // registry.computeds a llamar (sin control visible) → equivale a un `derive` inline
  optionValue?: string
  optionLabel?: string
  // NO se declara acá directo — el template lo calcula comparando `key` contra
  // `FrontConfig.validations.required` (nivel transacción, un solo lugar para todo lo `required`).
  required?:    boolean
  placeholder?: string
}

/** Slot tabla principal — forma MÍNIMA: solo `columns` (el resto lo pone el template). */
export interface ProductsSlot {
  source?:      string
  columns:      TrxField[]
  placeholder?: string
  rowFilter?:   boolean
  filterBy?:    { field: string; prefixFrom: string }
  search?:      SearchConfig
  addSupply?:   boolean   // false → oculta el picker "cargar insumo"
  select?:      SelectConfig          // multi-select del toolbar (ej. proveedores) — específico de una TRX, NO va por el template
  dynamicFields?: DynamicFieldsConfig  // comparativa: 1 columna por opción elegida (ej. precio por proveedor)
}

/** Slot resumen. La columna `qty` NO se redeclara — el template la toma de `products`
 *  (mismo label/sign/negate/max: es la MISMA cantidad, solo se edita una vez) y le fuerza
 *  `unitType:"unit"` (el carrito ya no re-elige unidad, así que nunca `unitSelect`) salvo
 *  que `columns` ya traiga otra columna con unidad propia (ej. AJT: `inventory`/newTotal) —
 *  ahí no la repite. `columns` = SOLO lo extra que products no tiene (removeButton es fijo,
 *  tampoco se declara). La mayoría de módulos no necesita nada → `summary: {}` alcanza. */
export interface SummarySlot {
  title?:   string
  columns?: TrxField[]        // columnas EXTRA antes de qty+removeButton (fijos), ej. AJT: newTotal
  target?:  string
  rowKey?:  string
  display?: 'inline' | 'drawer'
  trigger?: string
}

/** Agrupa lo VISUAL de la TRX (de filtros a carrito), separado del contrato
 *  (trxAttributes/event). El template lo aplana; también se acepta plano (backward-compat). */
export interface ItemsSlots {
  filter?:   FilterSpec | FilterSpec[]
  products?: ProductsSlot
  summary?:    SummarySlot | false   // false = sin carrito: `products` ES la transacción completa (ej. RPI/VFI)
}

/** JsonFront: qué se ve. `components` = lista PLANA de componentes por `type`. */
export interface FrontConfig {
  title?:      string
  subtitle?:   string
  rowKey?:     string
  components?:     ComponentNode[]     // SDUI: lista plana (los filtros van en un `filters`)
  derive?:         { key: string; compute: string }[]   // context DERIVADO (registry.computeds con $options)
  initCollection?: string              // hidrata la collection con las filas de un resource (ej. "main")
  headerBadge?:    string              // computed (registry) → badge del header (ej. finca del usuario)
  // Datos de la TRANSACCIÓN (no filtran tabla) — documento origen, proveedor, forma de pago…
  // Cada uno con control propio (ver `AttributeSpec`) → el template los suma a `filters` (se
  // renderizan y funcionan igual que cualquier filtro) Y van 1:1 a payload.trxAttributes.
  trxAttributes?:  AttributeSpec[]
  // Detalle de A QUÉ CAMPO aplica cada validación de nivel-transacción (ver `event`) — declaración
  // y activación separadas a propósito: `event` es la lista corta y legible de qué está prendido;
  // `validations` es donde se busca el detalle. El template aplica esto sobre la columna (misma
  // `qty` en products Y en el carrito heredado, sin tener que declararlo en la columna misma).
  validations?: {
    sign?:     string     // qué campo (selectorValue) permite +/- — igual que el `sign` viejo de TrxField, ahora acá
    negate?:   string     // qué campo se guarda negado (tipea positivo, se guarda negativo) — igual que el `negate` viejo
    required?: string[]   // keys que no pueden quedar vacías EN TODA fila — de `trxAttributes`/filtros (revisa REQUIRED_ATTRIBUTES) o de columnas de products/summary por `selectorValue` (revisa REQUIRED_FIELDS, por fila)
    // `{ condición: campo }` — `campo` (selectorValue) es obligatorio SOLO en las filas donde
    // `condición` (selectorValue de OTRO campo de esa misma fila) da verdadero. Ej. RPI:
    // `{ "rejected": "comment" }` — el comentario de rechazo solo es obligatorio en las filas
    // marcadas `rejected`, no en todas (por eso no entra en `required`, que es incondicional).
    // Lo revisa REQUIRED_FIELDS también.
    when?: Record<string, string>
  }
  // Eventos FRONT (registry.events) que gatean el botón de confirmar — ejecutores con nombre,
  // igual patrón que el back (IEventExecutor). `HAS_ITEMS` (≥1 fila) es el ÚNICO que corre
  // siempre, sin declararlo — toda TRX necesita al menos una línea. El resto (`STOCK_LIMIT`,
  // `REQUIRED_FIELDS`, `REQUIRED_ATTRIBUTES`, `PARAMS_READY`, o uno propio del módulo vía
  // `buildRegistry({ events })`) SOLO corre si se lista acá — a propósito, para que el JSON
  // diga a simple vista qué se valida en vez de quedar implícito.
  event?:          string[]
  // ── Forma MÍNIMA (el template `expandFront` la expande a location/filters/main/collection) ──
  items?:      ItemsSlots           // agrupa lo visual (filter/products/cart); también se acepta plano
  filter?:     FilterSpec | FilterSpec[]   // 2do filtro(s): 'category' | { source } (doc) | combo estático
  products?:   ProductsSlot        // tabla principal (solo `columns`)
  summary?:    SummarySlot | false   // resumen/carrito (`columns` + `title`); false = sin carrito
  // ── SLOTS internos (el template los arma; también aceptados explícitos = legacy) ──
  location?:   FilterConfig        // filtro ubicación FIJO → el template lo pone 1º
  main?:       MainSlot            // slot de la tabla principal
  filters?:    FilterConfig[]      // filtros VARIABLES (o legacy si hay component `filters`)
  fields?:     TrxField[]          // legacy (columnas main sin slot `main`)
  collection?: CollectionSection   // slot carrito (inline/drawer)
}

/** Sección de tabla (para componentes compuestos como `picker`). */
export interface TableSection {
  title?:   string
  fields:   TrxField[]
  rowKey?:  string
  target?:  string          // balde del payload (trxProducts…)
}

/** Un componente de UI (lista PLANA). `type` → registry.components[type]. El
 *  layout/responsive vive DENTRO del componente, no en el JSON (sin span/children). */
export interface ComponentNode {
  type:     string
  source?:   string           // 'main' | 'collection' | (futuro) resource id
  title?:    string
  fields?:   TrxField[]        // campos de datos (los consume table/card/…)
  rowKey?:   string
  target?:   string
  filters?:  FilterConfig[]    // para el component `filters` (self-contained)
  categoryFilters?: FilterConfig[]   // categoría/subcategoría del `table` — panel "Filtros" colapsable DENTRO de la tabla, no en la barra de arriba
  apply?:    string            // label del botón "Aplicar Filtros": estaciona los valores y confirma (en vez de auto-aplicar)
  expand?:   string            // renderer (registry) para una fila full-width debajo (ej. comentario de rechazo)
  badge?:    string            // computed (registry) → texto del badge del `heading` (ej. contador de pendientes)
  text?:     string            // texto del componente `note`
  optionValue?: string        // para `search` (combo de catálogo)
  optionLabel?: string
  placeholder?: string
  search?:   SearchConfig     // buscador/picker en el toolbar de la tabla
  select?:   { key: string; label: string; source: string; optionValue: string; optionLabel: string }  // multi-select en el toolbar → ctx.selections[key]
  rowFilter?: boolean         // buscador que filtra las filas de la tabla por texto
  filterBy?:  { field: string; prefixFrom: string }   // filtro cliente: fila entra si row[field] empieza con context[prefixFrom]
  titleField?: string         // campo que titula cada card de `reviewList`
  when?:       string         // computed que filtra qué filas entran a `reviewList` (truthy = incluir)
  emptyText?:  string         // texto cuando `reviewList` está vacío
  trigger?:    string         // label del botón que abre el `drawer`
  // Columnas DERIVADAS de una selección múltiple (comparativa): 1 columna por opción
  // elegida. `selector` = computed llamado con { ...row, $opt: opción }. `label` es
  // una plantilla con tokens de la opción, ej. 'Precio {short}'.
  // `pick` = campo de la fila donde se guarda la opción ELEGIDA (botón +): habilita
  // escoger 1 columna por fila (comparar y elegir precio/proveedor).
  dynamicFields?: { from: string; label: string; selector: string; pick?: string }
  cols?:     number           // para `grid` (grid-cols-N, default 10)
  span?:     number           // ancho del hijo en el grid (col-span)
  children?: ComponentNode[]  // para layout CSS (grid/stack)
  [key: string]: unknown
}

/** Una transición de la FSM (JsonWorkflow) — lógica pura, sin UI. */
export interface WfTransition {
  from:     string
  to:       string
  label?:   string      // texto del botón que GENERA esta transición (sin label → no hay botón, ej. auto)
  variant?: 'default' | 'secondary' | 'ghost'
  event?:   string | string[]   // efecto(s) post-success. El backend ejecuta los del workflow; el front corre SOLO los que existan en registry.actions (uno o varios).
  guard?:   string      // precondición → registry.guards[guard]  (FSM/UI)
}

/** JsonWorkflow: la máquina de estados. */
export interface WorkflowConfig {
  initialState: string
  states:       string[]
  transitions:  WfTransition[]
}

/** El config unificado que consume el runtime. `serie`/IdTrxDefinition son del
 *  backend; el front solo necesita `prefix` (→ trxPrefix del payload). El id de
 *  datos vive en cada resource (JsonREA.resources[].id → el dispatch). */
export interface JsonConfig {
  prefix:       string             // Prefix — marca de la transacción (→ payload) + key del cache
  JsonFront:    FrontConfig         // columna JsonFront
  JsonREA:      ReaConfig           // columna JsonREA  { resources, events, agents }
  JsonWorkflow: WorkflowConfig      // columna JsonWorkflow
}

// ── Registry: lo que el JSON no puede expresar, por id ──────────────

export interface CollectionApi {
  items:  Record<string, unknown>[]
  add:    (row: Record<string, unknown>) => void
  remove: (id: string) => void
  update: (id: string, patch: Record<string, unknown>) => void   // parchea una fila (edición inline · elegir opción)
  has:    (id: string) => boolean
}

export interface CellRenderCtx {
  value:      unknown
  row:        Record<string, unknown>
  field:      TrxField
  context:    Record<string, string>
  setValue:   (v: unknown) => void
  collection: CollectionApi
  keyField:   string     // rowKey configurado → identidad de la fila (no asumir 'id')
  removeProductRow?: (id: string) => void   // quita una fila AGREGADA a mano (`_added`) de la tabla
  addProductRow?: (row: Record<string, unknown>) => void   // agrega una fila EXTRA a la tabla principal (mismo canal que "cargar insumo")
  t?:         (key: string, opts?: Record<string, unknown>) => string   // i18n (keyPrefix 'trx') — para mensajes del renderer (ej. validación)
}

export interface ActionCtx {
  rows:            Record<string, unknown>[]
  collection:      Record<string, unknown>[]
  context:         Record<string, string>
  state:           string           // estado actual de la FSM
  config:          JsonConfig
  clearCollection: () => void       // vaciar el carrito (ej. al iniciar un nuevo pedido)
  transition?:     WfTransition     // la transición disparada (from/to → trxStates)
  trxLabel?:       string           // key i18n del módulo para el toast (ej. "requirement", "adjustment")
  t:               (key: string, opts?: Record<string, unknown>) => string   // i18n (keyPrefix 'trx') → toast traducido
  registry:        TrxRegistry      // para resolver columnas COMPUTED (ej. priceQty) al armar trxProductAttributes — no están en la fila, solo en registry.computeds
}

/** Contexto para evaluar un guard (precondición de transición, custom por `WfTransition.guard`). */
export interface GuardCtx {
  rows:       Record<string, unknown>[]
  collection: Record<string, unknown>[]
  context:    Record<string, string>
  state:      string
}

/** Contexto para un evento FRONT (`registry.events`, declarado en `FrontConfig.event`).
 *  Devuelve `null` (pasa) o el motivo YA TRADUCIDO (bloquea confirmar y se muestra junto
 *  al botón) — mismo contrato para el paquete default del motor y para los que registre
 *  cada módulo. `front` trae `main`/`collection` ya expandidos (columnas con `max`/`required`). */
export interface EventCtx {
  front:       FrontConfig
  rows:        Record<string, unknown>[]
  collection:  Record<string, unknown>[]
  context:     Record<string, string>
  filters:     FilterConfig[]
  enrichResources: Resource[]
  enrichedContext: Record<string, string>
  state:       string
  t:           (key: string, opts?: Record<string, unknown>) => string
}

export interface TrxRegistry {
  fetchers:    Record<string, Fetcher>
  computeds:   Record<string, (row: Record<string, unknown>) => unknown>
  renderers:   Record<string, (ctx: CellRenderCtx) => ReactNode>   // cómo renderizar un valor
  selectors?:  Record<string, (data: unknown, selectorValue: string) => unknown>   // buscadores por selectorType (override/extiende DEFAULT_SELECTORS)
  valueSources?: Record<string, (c: ValueSourceCtx) => unknown>                      // base por sourceType (override/extiende DEFAULT_VALUE_SOURCES)
  actions:     Record<string, (ctx: ActionCtx) => void | Promise<void>>
  guards?:     Record<string, (ctx: GuardCtx) => boolean>                            // preconditions FSM (custom por transición, vía `guard`)
  events?:     Record<string, (ctx: EventCtx) => string | null>                      // validaciones que gatean confirmar, por nombre (vía `FrontConfig.event`)
  components?: Record<string, (node: ComponentNode, ctx: RuntimeCtx) => ReactNode>  // SDUI custom
}

/** Estado + helpers que el runtime le pasa a cada componente SDUI para renderizar. */
export interface RuntimeCtx {
  t:           (key: string, opts?: Record<string, unknown>) => string   // i18n: traduce un label (keyPrefix 'trx'; fallback = el propio texto). `opts` para interpolación/pluralización (ej. count).
  front:       FrontConfig
  rows:        Record<string, unknown>[]   // filas del resource principal (con ediciones)
  loading:     boolean
  ready:       boolean                     // gate: ¿los filtros que el recurso pide (location…) están completos? Si no, no se fetchea.
  error:       unknown                     // error del fetch del recurso principal (null si ok)
  retry:       () => void                  // re-dispara el fetch del recurso (para el "Reintentar")
  collection:  CollectionApi
  addProductRow: (row: Record<string, unknown>) => void   // agrega una fila EXTRA a la tabla (ej. "cargar insumo" del catálogo)
  removeProductRow: (id: string) => void   // quita una fila EXTRA (`_added`) de la tabla — contraparte de addProductRow
  context:     Record<string, string>
  setContext:  (updater: (c: Record<string, string>) => Record<string, string>) => void
  setFilter:   (key: string, value: string) => void   // setea un filtro y resetea sus dependientes (cascada)
  options:     Record<string, { value: string; label: string }[]>
  filterData:  Record<string, unknown[]>                          // data CRUDA de los filtros ya traída (ej. categorías con Children) → reusable por pickers, sin re-fetch
  selections:  Record<string, Record<string, unknown>[]>          // selecciones MÚLTIPLES (multi-select → columnas/acciones derivadas)
  setSelection: (key: string, options: Record<string, unknown>[]) => void
  locked:      Set<string>
  state:       string
  transitions: WfTransition[]
  fire:        (t: WfTransition) => void
  canFire:     (t: WfTransition) => boolean
  blockReason: (t: WfTransition) => string | null   // motivo (texto YA traducido) de por qué canFire da false — null si sí se puede
  submitting:  boolean                              // true mientras un createTrx está en vuelo — spinner en el botón de confirmar
  makeColumns:  (fields: TrxField[], keyField: string, fromCollection?: boolean) => TableColumn<Record<string, unknown>>[]  // helper tabla
  renderField:  (field: TrxField, row: Record<string, unknown>) => ReactNode                       // genérico (card/…)
  keyField:    string
  registry:    TrxRegistry
  renderNode:  (node: ComponentNode, key: Key) => ReactNode
}

// Re-export por conveniencia del consumidor.
export type { Resource }
