import { getStoredUser } from '@/shared/lib/auth'
import type { AssignmentResult, UnitCheckout } from './types'

// ── Shared payload interfaces ──────────────────────────────────────

interface TrxAttribute {
  ATTRIBUTEKEY:   string
  ATTRIBUTEVALUE: string
}

interface TrxProduct {
  IDVARIETY:   number
  VARIETYNAME: string
  SKU:         string
  QTY:         number
}

interface TrxState {
  TRXSTATE: string
  COMMENTS: string
}

export interface TransactionPayload {
  TRXPREFIX:      string
  DESCR:          string
  Username:       string
  Location:       string
  TrxAttributes:  TrxAttribute[]
  TrxProducts:    TrxProduct[]
  TrxStates:      TrxState[]
}

export interface UpdatePayload {
  TRXPREFIX:      string
  TrxAttributes:  TrxAttribute[]
  TrxStates:      TrxState[]
}

function formatUtc(date: Date): string {
  return date.toISOString().replace('T', ' ').split('.')[0]
}

// ── Phase 1: create-trx — one payload per group/individual ─────────

export function buildTransactionPayload(
  assignment: AssignmentResult,
  startDate:  Date,
): TransactionPayload[] {
  const user     = getStoredUser()
  const username = user?.username ?? ''
  const location = user?.location ?? ''

  const commonAttrs = (employees: { Id: number; FullName: string }[]): TrxAttribute[] => [
    { ATTRIBUTEKEY: 'Employee',       ATTRIBUTEVALUE: JSON.stringify(employees) },
    { ATTRIBUTEKEY: 'Supplier',       ATTRIBUTEVALUE: JSON.stringify([{ IdGrower: assignment.grower.idThirdSupplier, NameGrower: assignment.grower.name }]) },
    { ATTRIBUTEKEY: 'InitialQTY',     ATTRIBUTEVALUE: String(assignment.initialQty) },
    { ATTRIBUTEKEY: 'ITC',            ATTRIBUTEVALUE: assignment.itc },
    { ATTRIBUTEKEY: 'ProductionType', ATTRIBUTEVALUE: assignment.productionType },
    { ATTRIBUTEKEY: 'StartDate',      ATTRIBUTEVALUE: formatUtc(startDate) },
  ]

  const trxProduct: TrxProduct = {
    IDVARIETY:   assignment.variety.IdVariety,
    VARIETYNAME: assignment.variety.Name,
    SKU:         assignment.product.SKU,
    QTY:         assignment.initialQty,
  }

  if (assignment.mode === 'individual') {
    // One TRX per employee
    return assignment.employeeGroups
      .flatMap(g => g.employees)
      .map(emp => ({
        TRXPREFIX:     'PRDLBR',
        DESCR:         'PRDLBR',
        Username:      username,
        Location:      location,
        TrxAttributes: commonAttrs([{ Id: emp.idEmployee ?? 0, FullName: emp.name }]),
        TrxProducts:   [trxProduct],
        TrxStates:     [{ TRXSTATE: 'INPROGRESS', COMMENTS: '' }],
      }))
  }

  // One TRX per group
  return assignment.employeeGroups.map(group => ({
    TRXPREFIX:     'PRDLBR',
    DESCR:         'PRDLBR',
    Username:      username,
    Location:      location,
    TrxAttributes: commonAttrs(
      group.employees.map(e => ({ Id: e.idEmployee ?? 0, FullName: e.name })),
    ),
    TrxProducts:   [trxProduct],
    TrxStates:     [{ TRXSTATE: 'INPROGRESS', COMMENTS: '' }],
  }))
}

// ── Phase 2: update — one payload per unit when checkout finishes ──

export function buildUpdatePayload(
  unitCheckout: UnitCheckout,
  endDate:      Date,
): UpdatePayload {
  return {
    TRXPREFIX: unitCheckout.unit.trxId,
    TrxAttributes: [
      { ATTRIBUTEKEY: 'FinalQTY', ATTRIBUTEVALUE: String(unitCheckout.totalQty) },
      { ATTRIBUTEKEY: 'Waste',    ATTRIBUTEVALUE: String(unitCheckout.waste) },
      { ATTRIBUTEKEY: 'EndDate',  ATTRIBUTEVALUE: formatUtc(endDate) },
    ],
    TrxStates: [{ TRXSTATE: 'Complete', COMMENTS: '' }],
  }
}

// ── Phase 3 (per-unit, real-time) ─────────────────────────────────

interface TrxDetail {
  ATTRIBUTEKEY:   string
  ATTRIBUTEVALUE: string
}

export interface LapPayload {
  IdTRX:      string
  TrxDetails: TrxDetail[]
}

export interface CompletePayload {
  IdTRX:         string
  TrxAttributes: TrxAttribute[]
  TrxDetails:    TrxDetail[]
  TrxStates:     TrxState[]
}

export function buildLapPayload(trxId: string, amount: number, timestamp: Date): LapPayload {
  return {
    IdTRX: trxId,
    TrxDetails: [{
      ATTRIBUTEKEY:   'LAP',
      ATTRIBUTEVALUE: JSON.stringify({ RecordDate: formatUtc(timestamp), QTY: amount }),
    }],
  }
}

export function buildCompletePayload(
  unitCheckout:   UnitCheckout,
  finalLapAmount: number,
  endDate:        Date,
): CompletePayload {
  return {
    IdTRX: unitCheckout.unit.trxId,
    TrxAttributes: [
      { ATTRIBUTEKEY: 'FinalQTY', ATTRIBUTEVALUE: String(unitCheckout.totalQty + finalLapAmount) },
      { ATTRIBUTEKEY: 'Waste',    ATTRIBUTEVALUE: String(unitCheckout.waste) },
      { ATTRIBUTEKEY: 'EndDate',  ATTRIBUTEVALUE: formatUtc(endDate) },
    ],
    TrxDetails: [{
      ATTRIBUTEKEY:   'LAP',
      ATTRIBUTEVALUE: JSON.stringify({ RecordDate: formatUtc(endDate), QTY: finalLapAmount }),
    }],
    TrxStates: [{ TRXSTATE: 'Complete', COMMENTS: '' }],
  }
}