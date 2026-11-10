import { INVALID, parseDecimal } from '@/shared/lib/formValidation'
import { FLAG_KEYS, type Credit, type CreditUpdate, type FinishedOrLoose, type FlagKey, type LineItemIn, type Whs } from './types'

// The editable form model of a credit: every value is a string while the user types, and
// `draftToUpdate` turns it back into the API payload (or a list of validation problems).

export interface HeaderDraft {
  company_name: string
  report_date: string
  po_number: string
  qa_inspector: string
  arrival_time: string
  awb: string
  flight: string
  whs: Whs
  recommendations: string
}

export const LINE_NUMBER_FIELDS = [
  'qty_order', 'qty_received', 'final_yield_oz', 'price_unit', 'freight_unit', 'labor_cost',
  'box_qty_credit_override', 'temperature', 'box_weight', 'gross_weight', 'net_weight',
] as const
export type LineNumberField = (typeof LINE_NUMBER_FIELDS)[number]

export interface LineDraft {
  key: string
  product_name: string
  code: string
  presentation: string
  finished_or_loose: FinishedOrLoose
  qty_order: string
  qty_received: string
  final_yield_oz: string
  price_unit: string
  freight_unit: string
  labor_cost: string
  box_qty_credit_override: string
  temperature: string
  box_weight: string
  gross_weight: string
  net_weight: string
  flags: Record<FlagKey, boolean>
  observations: string
}

export interface CreditDraft {
  header: HeaderDraft
  lines: LineDraft[]
}

export type DraftProblem =
  | { code: 'productRequired'; line: number }
  | { code: 'qtyRequired'; line: number }
  | { code: 'yieldRange'; line: number }
  | { code: 'notANumber'; line: number; field: LineNumberField }

let keySeq = 0
const nextKey = () => `line-${Date.now()}-${keySeq++}`

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export function lineDraftFrom(line: LineItemIn): LineDraft {
  return {
    key: nextKey(),
    product_name: line.product_name ?? '',
    code: str(line.code),
    presentation: str(line.presentation),
    finished_or_loose: line.finished_or_loose === 'FINISHED' ? 'FINISHED' : 'LOOSE',
    qty_order: str(line.qty_order),
    qty_received: str(line.qty_received),
    final_yield_oz: str(line.final_yield_oz),
    price_unit: str(line.price_unit),
    freight_unit: str(line.freight_unit),
    labor_cost: str(line.labor_cost),
    box_qty_credit_override: str(line.box_qty_credit_override),
    temperature: str(line.temperature),
    box_weight: str(line.box_weight),
    gross_weight: str(line.gross_weight),
    net_weight: str(line.net_weight),
    flags: Object.fromEntries(FLAG_KEYS.map((k) => [k, Boolean(line[k])])) as Record<FlagKey, boolean>,
    observations: str(line.observations),
  }
}

export function emptyLineDraft(): LineDraft {
  return lineDraftFrom({
    product_name: '', finished_or_loose: 'LOOSE', flag_rotten: false, flag_mech_dam: false, flag_leaf_spots: false,
    flag_cold_damage: false, flag_dehydrated: false, flag_long_stems: false,
  })
}

export function draftFromCredit(credit: Credit): CreditDraft {
  return {
    header: {
      company_name: credit.company_name ?? '',
      report_date: credit.report_date ?? '',
      po_number: str(credit.po_number),
      qa_inspector: str(credit.qa_inspector),
      arrival_time: str(credit.arrival_time),
      awb: str(credit.awb),
      flight: str(credit.flight),
      whs: credit.whs,
      recommendations: str(credit.recommendations),
    },
    lines: credit.line_items.map(lineDraftFrom),
  }
}

const nullable = (s: string) => (s.trim() === '' ? null : s.trim())

/** Numbers as typed, for the live preview; INVALID text counts as empty. */
export function lineDraftToInput(line: LineDraft): LineItemIn {
  const num = (s: string) => {
    const p = parseDecimal(s)
    return p === INVALID ? null : p
  }
  return {
    product_name: line.product_name.trim(),
    code: nullable(line.code),
    presentation: nullable(line.presentation),
    finished_or_loose: line.finished_or_loose,
    qty_order: num(line.qty_order),
    qty_received: num(line.qty_received),
    final_yield_oz: num(line.final_yield_oz),
    price_unit: num(line.price_unit),
    freight_unit: num(line.freight_unit),
    labor_cost: num(line.labor_cost),
    box_qty_credit_override: num(line.box_qty_credit_override),
    temperature: num(line.temperature),
    box_weight: num(line.box_weight),
    gross_weight: num(line.gross_weight),
    net_weight: num(line.net_weight),
    ...line.flags,
    observations: nullable(line.observations),
  }
}

export function validateDraft(draft: CreditDraft): DraftProblem[] {
  const problems: DraftProblem[] = []
  draft.lines.forEach((line, i) => {
    const n = i + 1
    if (!line.product_name.trim()) problems.push({ code: 'productRequired', line: n })
    for (const field of LINE_NUMBER_FIELDS) {
      if (parseDecimal(line[field]) === INVALID) problems.push({ code: 'notANumber', line: n, field })
    }
    const recv = parseDecimal(line.qty_received)
    if (recv === null) problems.push({ code: 'qtyRequired', line: n })
    const y = parseDecimal(line.final_yield_oz)
    if (typeof y === 'number' && (y < 0 || y > 16)) problems.push({ code: 'yieldRange', line: n })
  })
  return problems
}

export function draftToUpdate(draft: CreditDraft): CreditUpdate {
  const h = draft.header
  return {
    company_name: h.company_name.trim(),
    report_date: h.report_date,
    po_number: nullable(h.po_number),
    qa_inspector: nullable(h.qa_inspector),
    arrival_time: nullable(h.arrival_time),
    awb: nullable(h.awb),
    flight: nullable(h.flight),
    whs: h.whs,
    recommendations: nullable(h.recommendations),
    line_items: draft.lines.map(lineDraftToInput),
  }
}

/** Compares what would be sent, so cosmetic differences (keys, spacing) don't count as edits. */
export function isDraftDirty(a: CreditDraft, b: CreditDraft): boolean {
  return JSON.stringify(draftToUpdate(a)) !== JSON.stringify(draftToUpdate(b))
}
