import { getStoredUser } from '@/shared/lib/auth'
import type { TrxCreateDTO, TrxUpdateDTO, TrxAttributesDTO } from '@/shared/api/operations/model'
import type { AssignmentResult, UnitCheckout, Employee, LapRecord } from './types'

// "yyyy-MM-dd HH:mm:ss" — used for string attributeValues (StartDate, LAP RecordDate).
function formatUtc(date: Date): string {
  return date.toISOString().replace('T', ' ').split('.')[0]
}

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

  // Supplier carries every selected grower with its own ITC (ITC is no longer a global attr).
  const supplier = JSON.stringify(
    assignment.growers.map(s => ({ IdGrower: s.grower.idThirdSupplier, NameGrower: s.grower.name, ITC: s.itc })),
  )

  const commonAttrs = (employees: { Id: number; FullName: string }[]): TrxAttributesDTO[] => [
    { attributeKey: 'Employee',       attributeValue: JSON.stringify(employees) },
    { attributeKey: 'Supplier',       attributeValue: supplier },
    { attributeKey: 'InitialQTY',     attributeValue: String(assignment.initialQty) },
    { attributeKey: 'ProductionType', attributeValue: assignment.productionType },
    { attributeKey: 'StartDate',      attributeValue: formatUtc(startDate) },
  ]

  const trxProduct = {
    idVariety:   assignment.variety.IdVariety,
    varietyName: assignment.variety.Name,
    sku:         assignment.product.SKU,
    qty:         assignment.initialQty,
  }

  const base = (attrs: TrxAttributesDTO[]): TrxCreateDTO => ({
    trxPrefix:     'PRDLBR',
    descr:         'PRDLBR',
    username,
    location,
    trxAttributes: attrs,
    trxProducts:   [trxProduct],
    trxStates:     { trxState: 'INPROGRESS', comments: '' },
    trxDetails:    [],
  })

  if (assignment.mode === 'individual') {
    // One TRX per employee
    return assignment.employeeGroups
      .flatMap(g => g.employees)
      .map(emp => base(commonAttrs([{ Id: emp.idEmployee ?? 0, FullName: emp.name }])))
  }

  // One TRX per group
  return assignment.employeeGroups.map(group =>
    base(commonAttrs(group.employees.map(e => ({ Id: e.idEmployee ?? 0, FullName: e.name })))),
  )
}

// ── Phase 2/3 — lap & complete via PATCH updateTransaction(idTrxHeader, TrxUpdateDTO) ──
// The idTrxHeader goes in the URL, so it's no longer part of the body.

// A single lap → append one LAP detail to the transaction.
export function buildLapPayload(amount: number, timestamp: Date): TrxUpdateDTO {
  return {
    trxDetails: [{
      detailType:  'LAP',
      detailValue: JSON.stringify({ RecordDate: formatUtc(timestamp), QTY: amount }),
    }],
  }
}

// Complete → final QTY/Waste/EndDate attributes + Complete state. The final lap is
// optional: when finalLapAmount is 0 (closing with the laps already registered) no
// LAP detail is appended. 
export function buildCompletePayload(
  unitCheckout:   UnitCheckout,
  finalLapAmount: number,
  endDate:        Date,
): TrxUpdateDTO {
  const payload: TrxUpdateDTO = {
    trxAttributes: [
      { attributeKey: 'FinalQTY', attributeValue: String(unitCheckout.totalQty + finalLapAmount) },
      { attributeKey: 'Waste',    attributeValue: String(unitCheckout.waste) },
      { attributeKey: 'EndDate',  attributeValue: formatUtc(endDate) },
    ],
    trxStates: { trxState: 'COMPLETED', comments: '' },
  }
  if (finalLapAmount > 0) {
    payload.trxDetails = [{
      detailType:  'LAP',
      detailValue: JSON.stringify({ RecordDate: formatUtc(endDate), QTY: finalLapAmount }),
    }]
  }
  return payload
}

// Cancel → just flips the transaction state to CANCELLED (append).
export function buildCancelPayload(): TrxUpdateDTO {
  return {
    trxStates: { trxState: 'CANCELLED', comments: '' },
  }
}

// ── getTrx response → checkout units (persistence) ────────────────
// The getTrx response is untyped in the spec, so we model it here from the
// backend TrxResponse* DTOs (camelCase, as ASP.NET serializes by default).

export interface TrxResponseDTO {
  idTrxHeader:   number
  trxPrefix:     string
  trxDocument:   string
  status:        string
  username:      string
  location?:     string | null
  trxAttributes: { attributeKey: string; attributeValue?: string | null }[]
  trxProducts:   { idVariety: number; varietyName?: string | null; sku?: string | null; qty?: number | null }[]
  trxStates:     { trxState?: string | null; stateDate?: string | null; comments?: string | null }[]
  trxDetails:    { detailType: string; detailValue?: string | null }[]
}

function getAttr(trx: TrxResponseDTO, key: string): string {
  return trx.trxAttributes.find(a => a.attributeKey === key)?.attributeValue ?? ''
}

// Backend stores LAP timestamps as "yyyy-MM-dd HH:mm:ss" — normalize to ISO for Date()
function parseUtc(value: string): Date {
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  return isNaN(d.getTime()) ? new Date() : d
}

export function mapTrxToUnits(trxList: TrxResponseDTO[]): UnitCheckout[] {
  let groupNo = 0

  return trxList.map(trx => {
    // Employees from the "Employee" attribute (JSON string: [{Id, FullName}])
    let employees: Employee[] = []
    try {
      const raw = JSON.parse(getAttr(trx, 'Employee') || '[]') as { Id: number; FullName: string }[]
      employees = raw.map((e, i) => ({
        id:         `${trx.idTrxHeader}-${i}`,
        idEmployee: e.Id,
        name:       e.FullName,
        role:       trx.location ?? '',
      }))
    } catch { /* malformed attribute → empty list */ }

    // Laps from trxDetails (detailType === 'LAP', detailValue = {RecordDate, QTY})
    const laps: LapRecord[] = trx.trxDetails
      .filter(d => d.detailType === 'LAP')
      .map((d, i) => {
        let amount = 0
        let timestamp = new Date()
        try {
          const p = JSON.parse(d.detailValue ?? '{}')
          amount = Number(p.QTY) || 0
          if (p.RecordDate) timestamp = parseUtc(String(p.RecordDate))
        } catch { /* malformed detail → defaults */ }
        return { id: `${trx.idTrxHeader}-lap-${i}`, unitTrxId: String(trx.idTrxHeader), amount, timestamp }
      })

    const totalQty   = laps.reduce((s, l) => s + l.amount, 0)
    const waste      = Number(getAttr(trx, 'Waste')) || 0
    const product    = trx.trxProducts[0]
    const initialQty = Number(getAttr(trx, 'InitialQTY')) || Number(product?.qty) || 0
    const isMulti    = employees.length > 1
    const name       = isMulti ? `Grupo ${++groupNo}` : (employees[0]?.name ?? trx.trxDocument)

    return {
      unit: {
        trxId:       String(trx.idTrxHeader),   // numeric id → ready for PATCH
        name,
        employees,
        varietyName: product?.varietyName ?? '',
        sku:         product?.sku ?? '',
        initialQty,
      },
      laps,
      waste,
      totalQty,
    }
  })
}