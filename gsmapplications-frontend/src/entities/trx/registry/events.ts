import type { EventCtx, FrontConfig, TrxField } from '../model/runtime'
import { paramsReady } from '../model/engine'
import { overMax } from './renderers'

type Row = Record<string, unknown>

// Fuente que REALMENTE se manda al confirmar: el carrito si el módulo tiene uno, si no
// (RPI/VFI, `summary:false`) la tabla principal — mismo criterio que `actions.ts`'s createTrx.
const submissionRows = (front: FrontConfig, rows: Row[], collection: Row[]): Row[] =>
  front.collection ? collection : rows

// Campos declarados (products + carrito, si hay) — de ahí salen los `sign`/`negate`/`required` a revisar.
const submissionFields = (front: FrontConfig): TrxField[] =>
  [...(front.main?.fields ?? []), ...(front.collection?.fields ?? [])]

/**
 * Eventos FRONT genéricos (`registry.events`) — igual patrón que el back (IEventExecutor):
 * lógica escrita UNA vez, con nombre, referenciada desde `FrontConfig.event`. `HAS_ITEMS` es
 * el ÚNICO que corre siempre sin declararlo (toda TRX necesita ≥1 línea) — el resto SOLO corre
 * si el módulo lo lista en `event` (a propósito: así el JSON dice a simple vista qué se valida,
 * en vez de quedar implícito). Cada uno devuelve `null` (pasa) o el motivo YA TRADUCIDO.
 */
export const DEFAULT_EVENTS: Record<string, (ctx: EventCtx) => string | null> = {
  // Al menos 1 fila para poder confirmar (carrito si hay, si no la tabla principal). Mismo
  // nombre que ya usaba `registry/guards.ts`'s `hasItems` para este concepto — un solo vocabulario.
  HAS_ITEMS: ({ front, rows, collection, t }) => {
    const source = submissionRows(front, rows, collection)
    if (source.length > 0) return null
    return t(front.collection ? 'addProductsHint' : 'completeRequiredHint')
  },

  // Ninguna fila deja `remaining` en negativo. Aplica a los campos con `sign`/`negate` (ya
  // dicen "esto resta stock", sin un tag `max` aparte). Misma fórmula que el borde rojo del
  // input y el `addButton` (renderers.tsx's `overMax`) — un solo lugar. A diferencia de
  // HAS_ITEMS, este SOLO corre si el módulo lo declara en `event` (editar/tipear negativo y
  // bloquear-confirmar son dos cosas separadas a propósito).
  STOCK_LIMIT: ({ front, rows, collection, t }) => {
    const source = submissionRows(front, rows, collection)
    const fields = submissionFields(front).filter(f => (f.sign || f.negate) && f.selectorValue)
    if (!fields.length) return null
    const over = source.some(row => fields.some(f => overMax(f, row)))
    return over ? t('overMaxHint') : null
  },

  // Ninguna fila deja vacío un campo marcado `required` (incondicional, ej. una cantidad
  // obligatoria por línea) — y además, `validations.when` (condicional: `{condición: campo}`,
  // un campo es obligatorio SOLO en las filas donde otro campo de esa misma fila da verdadero,
  // ej. RPI: `{"rejected":"comment"}` — el comentario de rechazo solo se exige en filas
  // marcadas `rejected`, no en todas).
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

  // Filtros marcados `required` (incluye los `trxAttributes` CON control, ej. forma de pago/
  // fecha de entrega — se unifican en `filters` vía `attributeToFilter`) deben tener valor en
  // el context. Además revisa los `trxAttributes` SIN control (sin `label`, ej. `EmailSupplier`:
  // no pasan por `filters` porque no tienen combo/input que renderizar) — esos se buscan en
  // `validations.required` directo, contra el context YA enriquecido (`derive` los llena antes
  // de que esto corra, ej. `EmailSupplier` calculado del proveedor elegido).
  REQUIRED_ATTRIBUTES: ({ front, filters, context, t }) => {
    const missingFilter = filters.find(f => f.required && !context[f.key])
    if (missingFilter) return t('completeFieldHint', { field: t(missingFilter.label) })
    const requiredKeys = front.validations?.required ?? []
    const missingAttr = (front.trxAttributes ?? []).find(a => !a.label && requiredKeys.includes(a.key) && !context[a.key])
    return missingAttr ? t('completeFieldHint', { field: t(missingAttr.key) }) : null
  },

  // Si el módulo tiene un resource de ENRIQUECIMIENTO (enrichBy) gateado por context (ej. OCM:
  // LOADPRICEBYSUPPLIER, necesita el proveedor elegido), sus params deben estar completos antes
  // de confirmar — sin esto se podía finalizar sin proveedor (el precio quedaba vacío). Nombre
  // igual a la función que llama por dentro (`paramsReady`, engine.ts) — mismo vocabulario.
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
