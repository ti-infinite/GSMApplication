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
  createTrx: ({ rows, collection, context, config, transition, trxLabel, t, registry }) => {
    const user = getStoredUser() as { username?: string } | null
    // Atributos por producto = columnas del products menos las ESTRUCTURALES del motor
    // (qty/varietyName van aparte del DTO; `rejected` es un flag SOLO-UI para habilitar
    // edición, nunca de negocio) → ANIDADOS en cada producto (composición limpia; el back
    // descompone a sus tablas con EF).
    const front    = config.JsonFront
    const prodCols = front.items?.products?.columns ?? front.products?.columns ?? front.main?.fields ?? []
    const attrCols = prodCols.filter(c => {
      const k = c.value ?? c.selectorValue
      return !!k && k !== 'qty' && k !== 'varietyName' && k !== 'rejected'
    })
    // Una columna COMPUTED (ej. `priceQty`) nunca se guarda en la fila — solo existe al vuelo
    // vía `registry.computeds` para pintarla. Leer `r[key]` directo siempre da vacío ahí; hay
    // que llamar el computed con la fila, igual que hace el runtime para mostrarla en pantalla.
    const attrValue = (c: (typeof attrCols)[number], r: Record<string, unknown>): string => {
      const k = c.value ?? c.selectorValue ?? ''
      if (c.selectorType === 'COMPUTED') {
        const fn = registry.computeds[k]
        return String((fn ? fn(r) : r[k]) ?? '')
      }
      return String(r[k] ?? '')
    }

    // `summary:false` (u omitido) → sin carrito: no hay nada que "agregar", `products` ES la
    // transacción completa (ej. RPI/VFI: confirmás cada línea del documento origen tal cual
    // llegó, no armás un subconjunto). Ahí se manda `rows` (la tabla principal, con sus
    // ediciones ya aplicadas), no `collection` (que se queda vacía porque nadie la llena).
    const hasCart = !!(front.items?.summary ?? front.summary ?? front.collection)
    const source  = hasCart ? collection : rows

    // Variable (no literal contextual) → el campo trxProductsAttributes no choca con el DTO hasta
    // que regeneren orval con el TrxProductsDTO anidado.
    const trxProducts = source.map(r => ({
      idVariety:   Number(r.idVariety) || 0,
      varietyName: String(r.varietyName ?? ''),
      sku:         String(r.sku ?? ''),
      qty:         Number(r.qty) || 0,
      trxProductAttributes: attrCols.map(c => ({ attributeKey: pascal(c.value ?? c.selectorValue ?? ''), attributeValue: attrValue(c, r) })),
    }))

    // trxAttributes (transacción): las keys que el config LISTA en `trxAttributes` → su valor del
    // context (ej. combos herb/lote declarados como filtros). Si no está en el context (no hay
    // filtro que lo ponga ahí), cae a la primera fila — pasthrough de un atributo HEREDADO del
    // documento origen (ej. IdSupplier: RPI lo hereda por fila desde el OCM, no lo selecciona
    // nadie, así que nunca va a estar en `context`; viaja igual en cada línea).
    const trxAttributes = (front.trxAttributes ?? []).map(k => ({
      attributeKey: pascal(k),
      attributeValue: String(context[k] ?? source[0]?.[k] ?? ''),
    }))

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
        // EMAIL_NOTIFICATION: el backend ya no ejecuta el envío de forma síncrona/rastreable acá,
        // así que su `success` en la respuesta no refleja si el correo salió o no — mostrar el
        // warning para ESE evento es un falso negativo. Se excluye solo a él; otros eventos
        // (ej. ADJUST_INVENTORY) sí se ejecutan y su fallo sigue siendo relevante avisarlo.
        const failed = (result?.events ?? []).filter(ev => ev.success === false && ev.eventName !== 'EMAIL_NOTIFICATION')
        toast.success(created)
        if (failed.length) {
          const detail = failed.map(ev => t('eventFailed', { event: ev.eventName ?? '' })).join(' · ')
          setTimeout(() => toast.warning(detail), 1200)
        }

      })
      .catch(e => { console.error('[TRX] create-trx falló', e); toast.error(t('createFailed')); throw e })
  },
}
