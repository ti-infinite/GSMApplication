/** A supplier in the credits e-mail directory (who receives the credit notes). */
export interface CreditSupplier {
  id: number
  name: string
  emails: string[]
  notes: string | null
}

export interface CreditSupplierInput {
  name: string
  emails: string[]
  notes?: string | null
}

export interface SupplierBulkResult {
  created: number
  updated: number
  suppliers: CreditSupplier[]
}
