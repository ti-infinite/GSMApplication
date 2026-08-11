import type { TrxRegistry } from '../model/runtime'
import { DEFAULT_RENDERERS } from './renderers'
import { DEFAULT_GUARDS } from './guards'
import { DEFAULT_ACTIONS } from './actions'
import { DEFAULT_EVENTS } from './events'

export { DEFAULT_RENDERERS } from './renderers'
export { DEFAULT_GUARDS } from './guards'
export { DEFAULT_ACTIONS } from './actions'
export { DEFAULT_EVENTS } from './events'

/**
 * Une el KIT BASE (renderers/guards genéricos del motor) con lo ESPECÍFICO del
 * módulo (fetchers/computeds/actions/…). Cada TRX hace:
 *   const registry = buildRegistry({ fetchers, computeds, actions })
 * y ya tiene badge/input/addButton/removeButton/hasItems sin redefinirlos.
 */
export function buildRegistry(module: Partial<TrxRegistry>): TrxRegistry {
  return {
    fetchers:   { ...module.fetchers },
    computeds:  { ...module.computeds },
    renderers:  { ...DEFAULT_RENDERERS, ...module.renderers },
    selectors:  { ...module.selectors },
    valueSources: { ...module.valueSources },
    actions:    { ...DEFAULT_ACTIONS, ...module.actions },
    guards:     { ...DEFAULT_GUARDS, ...module.guards },
    events:     { ...DEFAULT_EVENTS, ...module.events },
    components: { ...module.components },
  }
}
