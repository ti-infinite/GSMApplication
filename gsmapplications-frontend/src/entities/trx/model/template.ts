// Expande el JsonFront MÍNIMO (trxAttributes + products + summary) a la forma interna
// (location gate + filters + derive + main/collection) que consume el runtime. Lo que es
// igual en todas las TRX vive AQUÍ, no en cada JSON.
import type { FrontConfig, FilterConfig, MainSlot, CollectionSection, TrxField, AttributeSpec } from './runtime'

// Al inyectarse acá, aplica a TODAS las TRX de una sola vez (no hay que declararlo por módulo).
const DEFAULT_LOCATION: FilterConfig = {
  key: 'location', label: 'costCenter', source: 'LOCATIONS',
  optionValue: 'location', optionLabel: 'name', cookieDefault: { field: 'location' },
  required: true,
}

// Cascada categoría → subcategoría de la tabla principal. Filtra el main por prefijo
// sku (el skuPrefix sale de la opción elegida → registry.computeds.skuPrefix).
// Los `label` son KEYS i18n en camelCase (convención del app); t() los traduce (es/en).
const CATEGORY_CASCADE: FilterConfig[] = [
  { key: 'category',    label: 'category',    source: 'CATEGORIES', optionValue: 'IdCategory', optionLabel: 'Descr' },
  { key: 'subcategory', label: 'subcategory', dependsOn: 'category', optionsFrom: 'Children', optionValue: 'IdCategory', optionLabel: 'Descr' },
]
const SKU_PREFIX_DERIVE = { key: 'skuPrefix', compute: 'skuPrefix' }
const SKU_PREFIX_FILTER = { field: 'sku', prefixFrom: 'skuPrefix' }

const DEFAULT_ROWKEY = 'idVariety'
const DEFAULT_TARGET = 'trxProducts'
const DEFAULT_SUMMARY_TITLE = 'summary'
const DEFAULT_SUMMARY_DISPLAY = 'drawer'
const FALLBACK_QTY_COLUMN: TrxField = { type: 'input', label: 'quantity', selectorValue: 'qty' }
const REMOVE_BUTTON: TrxField = { button: 'removeButton' }
// Para no repetirla en cada módulo (override: incluirla explícita en las columns).
const VARIETY_COLUMN: TrxField = { label: 'variety', selectorValue: 'varietyName' }

const keyOf = (c: TrxField) => c.value ?? c.selectorValue
const isQty = (c: TrxField) => keyOf(c) === 'qty'

const withVariety = (columns: TrxField[]): TrxField[] =>
  columns.some(c => keyOf(c) === 'varietyName') ? columns : [VARIETY_COLUMN, ...columns]

const withValidations = (columns: TrxField[], validations?: FrontConfig['validations']): TrxField[] => {
  if (!validations) return columns
  return columns.map(c => {
    // addButton has no selectorValue but guards the row's qty, so it inherits qty's sign/negate.
    const key = keyOf(c) ?? (c.button === 'addButton' ? 'qty' : undefined)
    if (!key) return c
    const sign     = c.sign     || key === validations.sign
    const negate   = c.negate   || key === validations.negate
    const required = c.required || (!!keyOf(c) && !!validations.required?.includes(key))
    if (sign === !!c.sign && negate === !!c.negate && required === !!c.required) return c
    return { ...c, sign: sign || undefined, negate: negate || undefined, required: required || undefined }
  })
}

// Mismo orden en products y summary: primero la variedad, después las validaciones.
const prepareColumns = (columns: TrxField[], validations?: FrontConfig['validations']) =>
  withValidations(withVariety(columns), validations)

// Un trxAttribute con `label` es un control → un filtro más. Sin `label` no se dibuja.
function attributeToFilter(a: AttributeSpec, requiredKeys?: string[]): FilterConfig | null {
  if (!a.label) return null
  const base = {
    key: a.key, label: a.label, placeholder: a.placeholder, section: a.section,
    required: a.required || !!requiredKeys?.includes(a.key),
  }
  if (a.resource) return { ...base, resource: a.resource, optionValue: a.optionValue ?? 'id', optionLabel: a.optionLabel ?? 'name' }
  if (a.source)   return { ...base, source: a.source,     optionValue: a.optionValue ?? 'id', optionLabel: a.optionLabel ?? 'name' }
  return { ...base, values: a.values, input: a.input, optionValue: 'value', optionLabel: 'label' }
}

/** Expande el JsonFront mínimo a la forma que consume el runtime. */
export function expandFront(input: FrontConfig, hasCategories?: boolean): FrontConfig {
  // `items` agrupa lo visual en el JSON; acá se aplana al nivel raíz.
  const front: FrontConfig = input.items ? { ...input, ...input.items, items: undefined } : input
  const attributes = front.trxAttributes ?? []

  const attrFilters = attributes
    .map(a => attributeToFilter(a, front.validations?.required))
    .filter((x): x is FilterConfig => x != null)
  const attrDerive = attributes.flatMap(a => (a.compute ? [{ key: a.key, compute: a.compute }] : []))

  // Categoría/subcategoría: se inyectan solas si el registry tiene CATEGORIES (no van en el JSON).
  const withCategories = !!hasCategories && !attrFilters.some(f => f.key === 'category')

  const main: MainSlot | undefined = front.products ? {
    source:      front.products.source,
    fields:      prepareColumns(front.products.columns, front.validations),
    placeholder: front.products.placeholder,
    rowFilter:   front.products.rowFilter,
    filterBy:    front.products.filterBy ?? (withCategories ? SKU_PREFIX_FILTER : undefined),
    search:      front.products.search,
    addSupply:   front.products.addSupply,
  } : undefined

  // La qty del carrito es la MISMA de products (mismas validaciones), con unidad fija.
  const qtyColumn: TrxField = { ...(main?.fields.find(isQty) ?? FALLBACK_QTY_COLUMN), unitType: 'unit' }

  const collection: CollectionSection | undefined = front.summary ? {
    title:   front.summary.title ?? DEFAULT_SUMMARY_TITLE,
    fields:  prepareColumns([qtyColumn, ...(front.summary.columns ?? []), REMOVE_BUTTON], front.validations),
    target:  front.summary.target ?? DEFAULT_TARGET,
    rowKey:  front.summary.rowKey,
    display: front.summary.display ?? DEFAULT_SUMMARY_DISPLAY,
    trigger: front.summary.trigger,
  } : undefined

  return {
    ...front,
    filters: [DEFAULT_LOCATION, ...attrFilters, ...(withCategories ? CATEGORY_CASCADE : [])],
    derive:  [...attrDerive, ...(withCategories ? [SKU_PREFIX_DERIVE] : [])],
    main, collection,
    rowKey:  DEFAULT_ROWKEY,
  }
}
