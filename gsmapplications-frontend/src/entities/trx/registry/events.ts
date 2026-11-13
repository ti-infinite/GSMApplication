import type { EventCtx, FrontConfig, TrxField } from '../model/runtimeTypes'
import { paramsReady } from '../model/engine'
import { overMax } from './renderers'

type Row = Record<string, unknown>

const submissionRows = (front: FrontConfig, rows: Row[], collection: Row[]): Row[] =>
  front.collection ? collection : rows

const submissionFields = (front: FrontConfig): TrxField[] =>
  [...(front.main?.fields ?? []), ...(front.collection?.fields ?? [])]

/**
 * Configurarlo en 'FrontConfig.event'. 'HAS_ITEMS' es el ÚNICO que corre siempre no se coloca
 * si el módulo lo lista en 'event' se ejecuta
 */
export const DEFAULT_EVENTS: Record<string, (ctx: EventCtx) => string | null> = {
  HAS_ITEMS: ({ front, rows, collection, t }) => {
    const source = submissionRows(front, rows, collection)
    if (source.length > 0) return null
    return t(front.collection ? 'addProductsHint' : 'completeRequiredHint')
  },

  // Ninguna fila deja 'remaining' en negativo. A diferencia de
  // HAS_ITEMS, este SOLO corre si el módulo lo declara en 'event' (editar/tipear negativo y
  // bloquear-confirmar son dos cosas separadas a propósito).
  STOCK_LIMIT: ({ front, rows, collection, t }) => {
    const source = submissionRows(front, rows, collection)
    const fields = submissionFields(front).filter(f => (f.sign || f.negate) && f.selectorValue)
    if (!fields.length) return null
    const over = source.some(row => fields.some(f => overMax(f, row)))
    return over ? t('overMaxHint') : null
  },

  // Ninguna fila deja vacío un campo marcado 'required' y además, 'validations.when' (condicional: '{condición: campo}',
  // un campo es obligatorio SOLO en las filas donde otro campo de esa misma fila da verdadero,
  // ej. RPI: '{"rejected":"comment"}'
  REQUIRED_FIELDS: ({ front, rows, collection, t }) => {
    const source = submissionRows(front, rows, collection)
    const fields = submissionFields(front).filter(f => f.required && f.selectorValue)
    const missing = fields.find(f => source.some(row => {
      const v = row[f.selectorValue as string]
      return v == null || v === ''
    }))
    if (missing) return t('completeFieldHint', { field: t(missing.label ?? '') })

    for (const [conditionKey, fieldKey] of Object.entries(front.validations?.when ?? {})) {
      const badRow = source.find(row => row[conditionKey] && !row[fieldKey])
      if (badRow) {
        const fieldDef = submissionFields(front).find(f => f.selectorValue === fieldKey)
        return t('completeFieldHint', { field: fieldDef?.label ? t(fieldDef.label) : fieldKey })
      }
    }
    return null
  },

  // Filtros marcados 'required' deben tener valor en el context. Además revisa los 'trxAttributes' 'validations.required' directo, 
  REQUIRED_ATTRIBUTES: ({ front, filters, context, t }) => {
    const missingFilter = filters.find(f => f.required && !context[f.key])
    if (missingFilter) return t('completeFieldHint', { field: t(missingFilter.label) })
    const requiredKeys = front.validations?.required ?? []
    const missingAttr = (front.trxAttributes ?? []).find(a => !a.label && requiredKeys.includes(a.key) && !context[a.key])
    return missingAttr ? t('completeFieldHint', { field: t(missingAttr.key) }) : null
  },

  // Si el módulo tiene un resource de ENRIQUECIMIENTO (enrichBy) gateado por context sus params deben estar completos antes de confirmar  Nombre.
  PARAMS_READY: ({ filters, enrichResources, enrichedContext, t }) => {
    const missing = enrichResources.find(r => !paramsReady(r, enrichedContext))
    if (!missing) return null
    const missingKey = missing.parameters.find(p =>
      (p.sourceType ?? 'CONTEXT') === 'CONTEXT' && !String(enrichedContext[p.values?.[0] ?? ''] ?? ''),
    )?.values?.[0]
    const label = filters.find(f => f.key === missingKey)?.label
    return label ? t('completeFieldHint', { field: t(label) }) : t('completeRequiredHint')
  },
}
