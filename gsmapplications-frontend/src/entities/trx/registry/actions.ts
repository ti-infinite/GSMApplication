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
    // (qty/varietyName van aparte del DTO, siempre) menos las que el JSON marca solo-UI
    // (`"sendToTrx": false`, ej. un flag de rechazo que habilita edición pero no es dato de
    // negocio) → ANIDADOS en cada producto (composición limpia; el back descompone a sus
    // tablas con EF). Mismo patrón opt-out que `addSupply`: por defecto se manda, se declara
    // en el JSON de la columna cuando NO — no hay que tocar este archivo por cada módulo nuevo.
    const front    = config.JsonFront
    const prodCols = front.items?.products?.columns ?? front.products?.columns ?? front.main?.fields ?? []
    const attrCols = prodCols.filter(c => {
      const k = c.value ?? c.selectorValue
      // `rejected` legacy: módulos ya seedeados que aún no migraron a `"sendToTrx": false`.
      return !!k && k !== 'qty' && k !== 'varietyName' && k !== 'rejected' && c.sendToTrx !== false
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

    // `validations.voidZeroQty` (opt-in, no bloquea nada): filas en 0 no se mandan. No-op en
    // módulos con carrito (`addButton` ya bloquea agregar con qty vacía/0, así que `collection`
    // nunca trae una de estas) — solo cambia algo en los módulos sin carrito que lo declaren
    // (ej. RPI: un insumo pedido que no llegó no queda como línea de producto).
    const trxSource = front.validations?.voidZeroQty ? source.filter(r => Number(r.qty) !== 0) : source

    // Variable (no literal contextual) → el campo trxProductsAttributes no choca con el DTO hasta
    // que regeneren orval con el TrxProductsDTO anidado.
    const trxProducts = trxSource.map(r => ({
      idVariety:   Number(r.idVariety) || 0,
      varietyName: String(r.varietyName ?? ''),
      sku:         String(r.sku ?? ''),
      qty:         Number(r.qty) || 0,
      trxProductAttributes: attrCols.map(c => ({ attributeKey: pascal(c.value ?? c.selectorValue ?? ''), attributeValue: attrValue(c, r) })),
    }))

    // trxAttributes (transacción): cada entrada que el config LISTA en `trxAttributes` → su valor
    // del context (ej. documento/proveedor/forma de pago, con o sin control propio — ver
    // `AttributeSpec`). Si no está en el context (no tiene control, ej. `EmailSupplier`, o no hay
    // filtro que lo ponga ahí), cae a la primera fila — pasthrough de un atributo HEREDADO del
    // documento origen (ej. IdSupplier: RPI lo hereda por fila desde el OCM, no lo selecciona
    // nadie, así que nunca va a estar en `context`; viaja igual en cada línea).
    const trxAttributes = (front.trxAttributes ?? []).map(a => ({
      attributeKey: pascal(a.key),
      attributeValue: String(context[a.key] ?? source[0]?.[a.key] ?? ''),
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
        const events = result?.events ?? []
        toast.success(created)

        // EMAIL_NOTIFICATION aparte: el mensaje que manda el backend es técnico ("Attribute
        // 'EmailSupplier' not found.", útil en consola, no para el usuario) — acá se arma uno
        // legible con el email real (mismo que se mandó en trxAttributes, no hace falta pedirlo
        // de nuevo). Genérico: cualquier módulo que declare "EmailSupplier"/"EmailSupplier" en
        // trxAttributes se beneficia, no es exclusivo de OCM.
        const emailEvent = events.find(ev => ev.eventName === 'EMAIL_NOTIFICATION')
        const email = payload.trxAttributes?.find(a => a.attributeKey === 'EmailSupplier')?.attributeValue
        if (emailEvent) {
          if (emailEvent.success === false) console.warn('[TRX] EMAIL_NOTIFICATION falló:', emailEvent.message)
          setTimeout(() => {
            if (emailEvent.success === false) toast.warning(t('emailSendFailed'))
            else if (email) toast.success(t('emailSent', { email }))
          }, 1200)
        }

        const otherFailed = events.filter(ev => ev.success === false && ev.eventName !== 'EMAIL_NOTIFICATION')
        if (otherFailed.length) {
          const detail = otherFailed.map(ev => t('eventFailed', { event: ev.eventName ?? '' })).join(' · ')
          setTimeout(() => toast.warning(detail), 1200)
        }

      })
      .catch(e => { console.error('[TRX] create-trx falló', e); toast.error(t('createFailed')); throw e })
  },
}
