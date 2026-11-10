import { getFilteredSuppliers } from '@/shared/api/operations/endpoints'
import type { SupplierDTOListApiResponse } from '@/shared/api/operations/model'
import { creditsFetch, parseCredits } from '@/shared/lib/ihCredits'
import type { CreditSupplier, CreditSupplierInput, SupplierBulkResult } from '../model/types'

// ih-credits supplier directory:
//   GET /suppliers · POST /suppliers · PATCH /suppliers/{id} · DELETE /suppliers/{id}
//   POST /suppliers/bulk {items:[{name, emails, notes?}]} -> {created, updated, suppliers}  (merge by name)
export const creditSuppliersApi = {
  async list(): Promise<CreditSupplier[]> {
    return parseCredits(await creditsFetch('/suppliers'), 'Failed to load suppliers')
  },
  async create(body: CreditSupplierInput): Promise<CreditSupplier> {
    return parseCredits(await creditsFetch('/suppliers', { method: 'POST', body: JSON.stringify(body) }), 'Failed to create the supplier')
  },
  async update(id: number, body: CreditSupplierInput): Promise<CreditSupplier> {
    return parseCredits(await creditsFetch(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), 'Failed to save the supplier')
  },
  async remove(id: number): Promise<void> {
    await parseCredits<void>(await creditsFetch(`/suppliers/${id}`, { method: 'DELETE' }), 'Failed to delete the supplier')
  },
  async bulk(items: CreditSupplierInput[]): Promise<SupplierBulkResult> {
    return parseCredits(await creditsFetch('/suppliers/bulk', { method: 'POST', body: JSON.stringify({ items }) }), 'Import failed')
  },
}

/** GSM's supplier master (db_ms.Suppliers): one optional e-mail per supplier inside the `contact` JSON. */
export async function fetchGsmSuppliers(): Promise<CreditSupplierInput[]> {
  const res = await getFilteredSuppliers({})
  const list = (res.data as SupplierDTOListApiResponse | undefined)?.data ?? []
  return list
    .filter((s) => s.nameSupplier && s.isActive !== false)
    .map((s) => {
      let email = ''
      try {
        email = (JSON.parse(s.contact ?? '{}') as { email?: string }).email ?? ''
      } catch {
        email = ''
      }
      return { name: s.nameSupplier!.trim(), emails: email ? [email.trim()] : [] }
    })
}
