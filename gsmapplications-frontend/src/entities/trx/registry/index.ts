import type { TrxRegistry } from '../model/runtime'
import { DEFAULT_RENDERERS } from './renderers'
import { DEFAULT_ACTIONS } from './actions'
import { DEFAULT_EVENTS } from './events'
import { DEFAULT_COMPUTEDS } from './computeds'

export { DEFAULT_RENDERERS } from './renderers'
export { DEFAULT_ACTIONS } from './actions'
export { DEFAULT_EVENTS } from './events'
export { DEFAULT_COMPUTEDS } from './computeds'

/**
 * Une el KIT BASE (renderers/events genéricos del motor) con lo ESPECÍFICO del
 * módulo (fetchers/computeds/actions/…). Cada TRX hace:
 *   const registry = buildRegistry({ fetchers, computeds, actions })
 * y ya tiene badge/input/addButton/removeButton/HAS_ITEMS sin redefinirlos.
 */
export function buildRegistry(module: Partial<TrxRegistry>): TrxRegistry {
  return {
    fetchers:   { ...module.fetchers },
    computeds:  { ...DEFAULT_COMPUTEDS, ...module.computeds },
    renderers:  { ...DEFAULT_RENDERERS, ...module.renderers },
    selectors:  { ...module.selectors },
    valueSources: { ...module.valueSources },
    actions:    { ...DEFAULT_ACTIONS, ...module.actions },
    guards:     { ...module.guards },
    events:     { ...DEFAULT_EVENTS, ...module.events },
    components: { ...module.components },
  }
}
