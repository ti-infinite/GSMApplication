// TEMPLATE GSM: las convenciones FIJAS de toda TRX (abierto a extensión, cerrado a
// modificación — SOLID/OCP). Expande el JsonFront MÍNIMO (filter + products + cart)
// a la forma interna (location gate + filters + derive + main/collection) que ya
// consume el runtime. Lo que es igual en las 7 TRX vive AQUÍ, no en cada JSON.
import type { FrontConfig, FilterConfig, MainSlot, CollectionSection, TrxField, FilterSpec, AttributeSpec } from './runtime'

// Filtro de ubicación FIJO (gate): 1º filtro de toda TRX. Nada carga hasta que haya
// location (por selección o cookie del usuario). Override opcional vía front.location.
// `required: true`: sin esto, el "Cargar insumo"/"Cargar inventario" (independiente del gate
// por ubicación del resource principal) dejaba agregar productos y confirmar SIN ubicación —
// en la mayoría de los casos quedaba "protegido" indirecto (tabla vacía por el gate → carrito
// vacío bloqueaba confirmar), pero el picker no pasa por ese gate. Al inyectarse acá, aplica a
// TODAS las TRX de una sola vez (no hay que declararlo por módulo).
const DEFAULT_LOCATION: FilterConfig = {
  key: 'location', label: 'costCenter', source: 'LOCATIONS',
  optionValue: 'location', optionLabel: 'name', cookieDefault: { field: 'location' },
  required: true,
}

// 2do filtro 'category': cascada categoría → subcategoría. Filtra el main por prefijo
// sku (el skuPrefix sale de la opción elegida → registry.computeds.skuPrefix).
// Los `label` son KEYS i18n en camelCase (convención del app); t() los traduce (es/en).
const CATEGORY_CASCADE: FilterConfig[] = [
  { key: 'category',    label: 'category',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
  { key: 'subcategory', label: 'subcategory', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
]

const DEFAULT_ROWKEY = 'idVariety'    // la entidad de trabajo siempre es una variedad/insumo
const DEFAULT_TARGET = 'trxProducts'  // el resumen siempre mapea a trxProducts del TrxCreateDTO
const DEFAULT_SUMMARY_TITLE = 'summary'   // key i18n FIJA del resumen (→ "Resumen"/"Summary")
const DEFAULT_SUMMARY_DISPLAY = 'drawer'  // FIJO: el resumen va en drawer

// La columna qty del carrito NO se redeclara: se toma tal cual de `products` (mismo
// label/sign/negate/max — es la MISMA cantidad, se edita una sola vez), forzando siempre
// unitType:"unit" (el carrito ya no re-elige unidad, nunca "unitSelect").
const FALLBACK_QTY_COLUMN: TrxField = { type: 'input', label: 'quantity', selectorValue: 'qty' }
const REMOVE_BUTTON: TrxField = { button: 'removeButton' }
const isQty = (c: TrxField) => (c.value ?? c.selectorValue) === 'qty'

// Toda tabla de TRX muestra la variedad. El template la antepone si el JSON no la trae,
// para no repetirla en cada módulo (override: incluirla explícita en las columns).
const VARIETY_COLUMN: TrxField = { label: 'variety', selectorValue: 'varietyName' }
const withVariety = (columns: TrxField[]): TrxField[] =>
  columns.some(c => (c.value ?? c.selectorValue) === 'varietyName') ? columns : [VARIETY_COLUMN, ...columns]

// Aplica `FrontConfig.validations` (nivel transacción: `sign`/`negate` por selectorValue exacto,
// `required` por lista de selectorValues) a la columna que matchea — así el campo no necesita
// declararlo directo (queda como antes, `field.sign`/`.negate`/`.required`, para que renderers/
// `overMax`/los eventos no cambien nada). Preserva compat: si una columna YA trae alguno propio
// (JSON viejo sin migrar), no se lo pisa.
const withValidations = (columns: TrxField[], validations?: FrontConfig['validations']): TrxField[] => {
  if (!validations) return columns
  return columns.map(c => {
    if (!c.selectorValue) return c
    const sign     = c.sign     || c.selectorValue === validations.sign
    const negate   = c.negate   || c.selectorValue === validations.negate
    const required = c.required || !!validations.required?.includes(c.selectorValue)
    if (sign === !!c.sign && negate === !!c.negate && required === !!c.required) return c
    return { ...c, sign: sign || undefined, negate: negate || undefined, required: required || undefined }
  })
}

const slug = (s: string) =>
  s.normalize('NFD').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')

interface Second { filters: FilterConfig[]; derive: { key: string; compute: string }[]; filterBy?: { field: string; prefixFrom: string } }

// Traduce UN spec de `filter` (keyword | documento | combo estático) a FilterConfig(s),
// acumulando el derive/filterBy que algunos sabores (category) necesitan.
function addFilterSpec(spec: FilterSpec, acc: Second): void {
  if (spec === 'category') {
    acc.filters.push(...CATEGORY_CASCADE)
    if (!acc.derive.some(d => d.key === 'skuPrefix')) acc.derive.push({ key: 'skuPrefix', compute: 'skuPrefix' })
    acc.filterBy = acc.filterBy ?? { field: 'sku', prefixFrom: 'skuPrefix' }
  } else if (typeof spec === 'object' && 'type' in spec && spec.type === 'combo') {
    // COMBO ESTÁTICO: opciones quemadas en el JSON (no todo se llena por un source).
    // `input:"text"|"date"` (sin `values`) → input libre / date picker en vez de combo
    // (FiltersBar ya sabe renderizar cualquier FilterConfig con esos `input` como tal).
    // `required` es opt-in: si el JSON no lo declara queda `undefined` (mismo comportamiento
    // de siempre) — no exige tocar los JSON de los demás módulos.
    acc.filters.push({ key: spec.key ?? slug(spec.label ?? 'filter'), label: spec.label ?? 'filter',
                       values: spec.values, optionValue: 'value', optionLabel: 'label', input: spec.input,
                       required: spec.required })
  } else if (typeof spec === 'object' && 'type' in spec && spec.type === 'resource') {
    // COMBO DESDE RESOURCE: opciones desde un resource (JsonREA) con params del context + gate.
    // Ej. Requerimiento ← LOADMISSINGTRX(location, origen, destino). Al elegir → context → líneas.
    acc.filters.push({ key: spec.key ?? slug(spec.label ?? spec.resource), label: spec.label ?? 'document', resource: spec.resource,
                       optionValue: spec.optionValue ?? 'id', optionLabel: spec.optionLabel ?? 'name', placeholder: spec.placeholder })
  } else if (typeof spec === 'object' && 'source' in spec) {
    // DOCUMENTO (recepción/OC/factura): recibe location → lista los docs a derivar.
    acc.filters.push({ key: 'document', label: spec.label ?? 'document', source: spec.source,
                       optionValue: spec.optionValue ?? 'id', optionLabel: spec.optionLabel ?? 'name', input: spec.input })
  }
}

// Un `trxAttributes` con control (label) se vuelve un filtro más — misma FiltersBar, mismo
// context, mismo gate de resources — así no hay que declarar la key dos veces (antes: una en
// `filter`, otra en `trxAttributes: string[]`). Sin `label` → sin control (ej. EmailSupplier,
// su valor lo pone otra cosa, ej. un action override); no se agrega a `filters`, solo viaja
// tal cual en `front.trxAttributes` para que `actions.ts` lo mande al payload.
function attributeToFilter(a: AttributeSpec, requiredKeys?: string[]): FilterConfig | null {
  if (!a.label) return null
  const required = a.required || !!requiredKeys?.includes(a.key)
  if (a.resource) return { key: a.key, label: a.label, resource: a.resource, optionValue: a.optionValue ?? 'id', optionLabel: a.optionLabel ?? 'name', placeholder: a.placeholder, required, section: a.section }
  if (a.source)   return { key: a.key, label: a.label, source: a.source, optionValue: a.optionValue ?? 'id', optionLabel: a.optionLabel ?? 'name', placeholder: a.placeholder, required, section: a.section }
  return { key: a.key, label: a.label, values: a.values, optionValue: 'value', optionLabel: 'label', input: a.input, placeholder: a.placeholder, required, section: a.section }
}

/**
 * Expande el JsonFront mínimo a la forma que consume el runtime. Si el config trae
 * `components` (SDUI legacy) no toca nada. Idempotente para configs que ya declaran
 * main/collection/filters explícitos (los respeta y solo garantiza la location fija).
 *
 * `hasCategories`: TrxRuntime lo pasa en `true` si el módulo registra un fetcher `CATEGORIES`
 * — mismo criterio que ya usa "Cargar insumo" con `CATALOG` (`showAddPicker`). Categoría/
 * subcategoría dejan de declararse en el JSON (`"filter":"category"` queda deprecado, se
 * ignora si ya no aparece) — el motor las inyecta solo y las renderiza DENTRO de la tabla
 * (panel "Filtros" colapsable), no en la barra de filtros de arriba junto a ubicación.
 */
export function expandFront(input: FrontConfig, hasCategories?: boolean): FrontConfig {
  if (input.components) return input   // SDUI legacy: el JSON manda tal cual

  // `items` agrupa lo visual (filter/products/cart) para separarlo del contrato
  // (trxAttributes/event). Lo aplanamos aquí → el resto del template no cambia.
  const front: FrontConfig = input.items ? { ...input, ...input.items, items: undefined } : input

  // 1) Ubicación FIJA (gate). Override opcional (label/source) vía front.location.
  const location: FilterConfig = { ...DEFAULT_LOCATION, ...(front.location ?? {}) }

  // 2) 2do filtro(s) variable(s): documento | combo estático | array de varios (más category
  // vía JSON, deprecado pero soportado — ver abajo la inyección automática).
  let second: FilterConfig[]
  let derive = front.derive ?? []
  let filterBy = front.products?.filterBy ?? front.main?.filterBy
  const f = front.filter
  if (f != null) {
    const acc: Second = { filters: [], derive, filterBy }
    for (const spec of Array.isArray(f) ? f : [f]) addFilterSpec(spec, acc)
    second = acc.filters; derive = acc.derive; filterBy = acc.filterBy
  } else {
    second = front.filters ?? []   // legacy: filtros explícitos
  }

  // `trxAttributes` con control (label) → un filtro más (ver `attributeToFilter`). Los sin
  // control (solo `key`) NO se agregan acá — siguen en `front.trxAttributes` tal cual, para
  // que `actions.ts` los mande al payload igual, sin pasar por la UI.
  const attrFilters = (front.trxAttributes ?? [])
    .map(a => attributeToFilter(a, front.validations?.required))
    .filter((x): x is FilterConfig => x != null)
  second = [...second, ...attrFilters]

  // `trxAttributes` con `compute` (sin control, ej. EmailSupplier) → un `derive` más, sin
  // declarar la key dos veces (antes: una en `trxAttributes`, otra en un `derive` aparte).
  for (const a of front.trxAttributes ?? []) {
    if (a.compute && !derive.some(d => d.key === a.key)) derive = [...derive, { key: a.key, compute: a.compute }]
  }

  // Categoría/subcategoría FIJAS por registry (no por JSON): si ya llegaron por el `"filter"`
  // deprecado no se duplican (chequea la key); si no, se agregan solas — mismo resultado final
  // sea cual sea el camino, la única diferencia real es DÓNDE se renderizan (ver defaultTree).
  if (hasCategories && !second.some(sf => sf.key === 'category')) {
    second = [...second, ...CATEGORY_CASCADE]
    if (!derive.some(d => d.key === 'skuPrefix')) derive = [...derive, { key: 'skuPrefix', compute: 'skuPrefix' }]
    filterBy = filterBy ?? { field: 'sku', prefixFrom: 'skuPrefix' }
  }

  // 3) products → main ; cart → collection (columns → fields; defaults target/rowKey/title).
  const main: MainSlot | undefined = front.main ?? (front.products ? {
    source:      front.products.source,
    fields:      withValidations(withVariety(front.products.columns), front.validations),
    placeholder: front.products.placeholder,
    rowFilter:   front.products.rowFilter,
    filterBy,
    search:      front.products.search,
    addSupply:   front.products.addSupply,
  } : undefined)

  const productsQty = main?.fields.find(isQty) ?? FALLBACK_QTY_COLUMN
  const qtyColumn: TrxField = { ...productsQty, unitType: 'unit' }

  const collection: CollectionSection | undefined = front.collection ?? (front.summary ? {
    title:   front.summary.title ?? DEFAULT_SUMMARY_TITLE,     // título FIJO
    fields:  withVariety(withValidations([
      qtyColumn,
      ...(front.summary.columns ?? []),
      REMOVE_BUTTON,
    ], front.validations)),
    target:  front.summary.target ?? DEFAULT_TARGET,
    rowKey:  front.summary.rowKey,
    display: front.summary.display ?? DEFAULT_SUMMARY_DISPLAY,  // FIJO: drawer
    trigger: front.summary.trigger,
  } : undefined)

  return {
    ...front,
    location: undefined,               // ya vive como filters[0]
    filters:  [location, ...second],
    derive, main, collection,
    rowKey:   front.rowKey ?? DEFAULT_ROWKEY,
  }
}
