// Public API of the checkout feature: register laps, complete/cancel units, and
// rebuild active checkout state from persisted transactions.
export { CheckoutView } from './ui/CheckoutView'
export {
  buildLapPayload,
  buildCompletePayload,
  buildCancelPayload,
  mapTrxToUnits,
} from './lib/checkoutMapper'
export type { TrxResponseDTO } from './lib/checkoutMapper'
export type { CheckoutUnit, LapRecord, UnitCheckout } from './model/types'
