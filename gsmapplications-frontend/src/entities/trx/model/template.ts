// TEMPLATE GSM: las convenciones FIJAS de toda TRX (abierto a extensión, cerrado a
// modificación — SOLID/OCP). Expande el JsonFront MÍNIMO (filter + products + cart)
// a la forma interna (location gate + filters + derive + main/collection) que ya
// consume el runtime. Lo que es igual en las 7 TRX vive AQUÍ, no en cada JSON.
import type { FrontConfig, FilterConfig, MainSlot, CollectionSection, TrxField, FilterSpec } from './runtime'

// Filtro de ubicación FIJO (gate): 1º filtro de toda TRX. Nada carga hasta que haya
// location (por selección o cookie del usuario). Override opcional vía front.location.
const DEFAULT_LOCATION: FilterConfig = {
  key: 'location', label: 'costCenter', source: 'FINCAS',
  optionValue: 'location', optionLabel: 'name', cookieDefault: { field: 'location' },
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

// Toda tabla de TRX muestra la variedad. El template la antepone si el JSON no la trae,
// para no repetirla en cada módulo (override: incluirla explícita en las columns).
const VARIETY_COLUMN: TrxField = { label: 'variety', selectorValue: 'varietyName' }
const withVariety = (columns: TrxField[]): TrxField[] =>
  columns.some(c => (c.value ?? c.selectorValue) === 'varietyName') ? columns : [VARIETY_COLUMN, ...columns]

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

/**
 * Expande el JsonFront mínimo a la forma que consume el runtime. Si el config trae
 * `components` (SDUI legacy) no toca nada. Idempotente para configs que ya declaran
 * main/collection/filters explícitos (los respeta y solo garantiza la location fija).
 */
export function expandFront(input: FrontConfig): FrontConfig {
  if (input.components) return input   // SDUI legacy: el JSON manda tal cual

  // `items` agrupa lo visual (filter/products/cart) para separarlo del contrato
  // (trxAttributes/event). Lo aplanamos aquí → el resto del template no cambia.
  const front: FrontConfig = input.items ? { ...input, ...input.items, items: undefined } : input

  // 1) Ubicación FIJA (gate). Override opcional (label/source) vía front.location.
  const location: FilterConfig = { ...DEFAULT_LOCATION, ...(front.location ?? {}) }

  // 2) 2do filtro(s) variable(s): 'category' | documento | combo estático | array de varios.
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

  // 3) products → main ; cart → collection (columns → fields; defaults target/rowKey/title).
  const main: MainSlot | undefined = front.main ?? (front.products ? {
    source:      front.products.source,
    fields:      withVariety(front.products.columns),
    placeholder: front.products.placeholder,
    rowFilter:   front.products.rowFilter,
    filterBy,
    search:      front.products.search,
    addSupply:   front.products.addSupply,
  } : undefined)

  const collection: CollectionSection | undefined = front.collection ?? (front.summary ? {
    title:   front.summary.title ?? DEFAULT_SUMMARY_TITLE,     // título FIJO
    fields:  withVariety(front.summary.columns),
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
