import type { Employee } from '@/entities/employee'

// ── Checkout domain model ─────────────────────────────────────────

// One unit = one TRX (one group OR one individual)
export interface CheckoutUnit {
  trxId:       string      // returned by backend after create-trx
  name:        string      // "Grupo 1" or employee name
  employees:   Employee[]
  varietyName: string
  sku:         string
  initialQty:  number
}

// A single lap/measurement for a unit
export interface LapRecord {
  id:        string
  unitTrxId: string
  amount:    number      // integer — produced quantity for this lap
  waste:     number      // integer — waste recorded for this lap
  timestamp: Date
}

// Accumulated state per unit during checkout
export interface UnitCheckout {
  unit:       CheckoutUnit
  laps:       LapRecord[]
  totalQty:   number     // sum of lap amounts
  totalWaste: number     // sum of lap wastes — sent to backend as the "Waste" attribute
}
