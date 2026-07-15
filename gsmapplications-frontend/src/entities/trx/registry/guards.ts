import type { GuardCtx } from '../model/runtime'

/** Guards GENÉRICOS (precondiciones de transición). Reusables por cualquier TRX. */
export const DEFAULT_GUARDS: Record<string, (ctx: GuardCtx) => boolean> = {
  hasItems: ctx => ctx.collection.length > 0,   // el carrito no está vacío
  hasRows:  ctx => ctx.rows.length > 0,
}
