import { getStoredUser } from '@/shared/lib/auth'
import type { TrxCreateDTO, TrxAttributesDTO } from '@/shared/api/operations/model'
import { formatUtc } from '@/shared/lib/datetime'
import type { AssignmentResult } from '../model/types'

// ── Phase 1: create-trx — one TrxCreateDTO per group/individual ────
// The endpoint accepts ONE transaction per call, so the caller issues N calls
// (one per element) and reads each returned TrxDocument/IdTrxHeader.

export function buildTransactionPayload(
  assignment: AssignmentResult,
  startDate:  Date,
): TrxCreateDTO[] {
  const user     = getStoredUser()
  const username = user?.username ?? ''
  const location = user?.location ?? ''

  // Each mesa (group) carries its own product; resolve it by id.
  const byId = new Map(assignment.products.map(p => [p.id, p]))

  // One TRX per mesa, each with its own product / qty / growers / production type.
  return assignment.employeeGroups.flatMap(group => {
    const cp = group.productId ? byId.get(group.productId) : undefined
    if (!cp) return []   // group without a resolved product — skipped (validated in the wizard)

    const qty = group.qty ?? cp.defaultQty

    // Supplier carries every grower of this product with its own ITC.
    const supplier = JSON.stringify(
      cp.growers.map(s => ({ IdGrower: s.grower.idThirdSupplier, NameGrower: s.grower.name, ITC: s.itc })),
    )

    const trxAttributes: TrxAttributesDTO[] = [
      { attributeKey: 'Employee',       attributeValue: JSON.stringify(group.employees.map(e => ({ Id: e.idEmployee ?? 0, FullName: e.name }))) },
      { attributeKey: 'Supplier',       attributeValue: supplier },
      { attributeKey: 'InitialQTY',     attributeValue: String(qty) },
      { attributeKey: 'ProductionType', attributeValue: cp.productionType },
      { attributeKey: 'StartDate',      attributeValue: formatUtc(startDate) },
    ]

    return [{
      trxPrefix:     'PRDLBR',
      descr:         'PRDLBR',
      username,
      location,
      trxAttributes,
      trxProducts:   [{ idVariety: cp.variety.IdVariety, varietyName: cp.variety.Name, sku: cp.product.SKU, qty }],
      trxStates:     { fromTrxState: 'UNDEFINED', toTrxState: 'INPROGRESS', comments: '' },
      trxDetails:    [],
    }]
  })
}
