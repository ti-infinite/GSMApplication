import { toast } from 'sonner'
import { getStoredUser } from '@/shared/lib/auth'
import { createTransaction } from '@/shared/api/operations/endpoints'
import type { TrxCreateDTO, ResponseCreateTransactionDTOApiResponse } from '@/shared/api/operations/model'
import type { ActionCtx } from '../model/runtime'

/**
 * Acciones GENÉRICAS del motor — comunes a TODAS las TRX, no se redefinen por módulo.
 * `createTrx` arma el TrxCreateDTO desde la collection + context + la transición y lo
 * postea (el carrito siempre mapea a trxProducts; la cantidad vive en `qty`). Un módulo
 * puede overridear un id o agregar el suyo (buildRegistry: DEFAULT_ACTIONS < module).
 */
// El backend recibe las claves de atributo en PascalCase (mayúscula inicial): consumption → Consumption.
// Se transforma acá (al armar el payload), NO en el JSON (el selectorValue lee la data del row) ni en i18n.
const pascal = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export const DEFAULT_ACTIONS: Record<string, (ctx: ActionCtx) => void | Promise<void>> = {
  createTrx: ({ collection, context, config, transition, trxLabel, t }) => {
    const user = getStoredUser() as { username?: string } | null
    // Atributos por producto = columnas del products menos qty/varietyName → ANIDADOS en cada producto
    // (el atributo PERTENECE al producto: composición limpia; el back descompone a sus tablas con EF).
    const front    = config.JsonFront
    const prodCols = front.items?.products?.columns ?? front.products?.columns ?? front.main?.fields ?? []
    const attrKeys = prodCols
      .map(c => c.value ?? c.selectorValue)
      .filter((k): k is string => !!k && k !== 'qty' && k !== 'varietyName')

    // Variable (no literal contextual) → el campo trxProductsAttributes no choca con el DTO hasta
    // que regeneren orval con el TrxProductsDTO anidado.
    const trxProducts = collection.map(r => ({
      idVariety:   Number(r.idVariety) || 0,
      varietyName: String(r.varietyName ?? ''),
      sku:         String(r.sku ?? ''),
      qty:         Number(r.qty) || 0,
      trxProductAttributes: attrKeys.map(k => ({ attributeKey: pascal(k), attributeValue: String(r[k] ?? '') })),
    }))

    // trxAttributes (transacción): las keys que el config LISTA en `trxAttributes` → su valor del
    // context (ej. combos herb/lote declarados como filtros). Vos decís cuáles; nada implícito.
    const trxAttributes = (front.trxAttributes ?? []).map(k => ({ attributeKey: pascal(k), attributeValue: String(context[k] ?? '') }))

    const payload: TrxCreateDTO = {
      trxPrefix: config.prefix,
      descr:     config.prefix,
      username:  user?.username ?? '',
      location:  String(context.location ?? ''),
      trxAttributes,
      trxProducts,
      trxStates:  { fromTrxState: transition?.from, toTrxState: transition?.to, comments: '' },
      trxDetails: [],
    }
    return createTransaction(payload)
      .then(res => {
        // Respuesta nueva: data = { trxDocument, events[] }. El documento vive en trxDocument
        // (antes data era el string directo); events son los efectos post-success del workflow.
        const result = (res.data as ResponseCreateTransactionDTOApiResponse | undefined)?.data
        const doc = result?.trxDocument ?? ''
        const n = payload.trxProducts?.length ?? 0
        // Toast 100% i18n: `trxLabel` es una KEY (→ "Requerimiento"/"Requirement") y el
        // mensaje resuelve plural por `count` (created_one/created_other).
        const created = t('created', { label: t(trxLabel ?? 'transaction'), doc, count: n })
        // 1º el VERDE de éxito (la trx se creó). Si un efecto del workflow (ej. SEND_EMAIL) falló,
        // el WARNING entra con un delay chico → se ve el verde primero y el otro se DESLIZA y apila
        // encima (la animación de stack la hace sonner). Cada uno con su propio auto-dismiss.
        const failed = (result?.events ?? []).filter(ev => ev.success === false)
        toast.success(created)
        if (failed.length) {
          const detail = failed.map(ev => t('eventFailed', { event: ev.eventName ?? '' })).join(' · ')
          setTimeout(() => toast.warning(detail), 1200)
        }

      })
      .catch(e => { console.error('[TRX] create-trx falló', e); toast.error(t('createFailed')); throw e })
  },
}
