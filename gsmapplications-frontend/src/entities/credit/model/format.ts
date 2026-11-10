import type { Credit, CreditSummary, FlagKey, LineItem, LineItemIn, Whs } from './types'

export const WAREHOUSES: { code: Whs; name: string }[] = [
  { code: 'BOS', name: 'Boston' },
  { code: 'CHI', name: 'Chicago' },
  { code: 'MIA', name: 'Miami' },
  { code: 'NJ', name: 'New Jersey' },
]

/** i18n key under `credits.flags.*` for each damage flag. */
export const FLAG_LABEL_KEY: Record<FlagKey, string> = {
  flag_rotten: 'rotten',
  flag_mech_dam: 'mechDam',
  flag_leaf_spots: 'leafSpots',
  flag_cold_damage: 'coldDamage',
  flag_dehydrated: 'dehydrated',
  flag_long_stems: 'longStems',
}

export function isCurrentMonth(iso: string, now = new Date()): boolean {
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/** The quantity the credit is computed from (third-party: received; agro: ordered). */
export function lineBaseQty(line: LineItemIn, supplierType: Credit['supplier_type']): number | null {
  return supplierType === 'agro' ? (line.qty_order ?? null) : (line.qty_received ?? null)
}

/** Strips server-computed fields so a stored line can be sent back as input. */
export function toLineInput(line: LineItem | LineItemIn): LineItemIn {
  const { product_name, code, box_weight, presentation, finished_or_loose, qty_order, qty_received, gross_weight,
    net_weight, final_yield_oz, labor_cost, price_unit, freight_unit, box_qty_credit_override, temperature,
    flag_rotten, flag_mech_dam, flag_leaf_spots, flag_cold_damage, flag_dehydrated, flag_long_stems, observations } = line
  return { product_name, code, box_weight, presentation, finished_or_loose, qty_order, qty_received, gross_weight,
    net_weight, final_yield_oz, labor_cost, price_unit, freight_unit, box_qty_credit_override, temperature,
    flag_rotten, flag_mech_dam, flag_leaf_spots, flag_cold_damage, flag_dehydrated, flag_long_stems, observations }
}

export function emptyLine(): LineItemIn {
  return {
    product_name: '',
    finished_or_loose: 'LOOSE',
    flag_rotten: false,
    flag_mech_dam: false,
    flag_leaf_spots: false,
    flag_cold_damage: false,
    flag_dehydrated: false,
    flag_long_stems: false,
  }
}

/** Live preview of the third-party formulas (same as the server's calc.py), for the lines editor. */
export function previewThirdPartyLine(line: LineItemIn): { qtyCredit: number | null; usable: number | null; total: number | null } {
  const recv = line.qty_received ?? null
  if (recv === null) return { qtyCredit: null, usable: null, total: null }
  let qtyCredit: number
  if (line.box_qty_credit_override !== null && line.box_qty_credit_override !== undefined) {
    qtyCredit = line.box_qty_credit_override
  } else {
    const y = line.final_yield_oz ?? null
    if (y === null) return { qtyCredit: null, usable: null, total: null }
    if ((line.finished_or_loose ?? 'LOOSE') === 'FINISHED') qtyCredit = recv * (1 - y / 16)
    else qtyCredit = y <= 0 ? recv : y >= 15 ? 0 : ((15 - y) / 16) * recv
  }
  qtyCredit = Math.max(0, qtyCredit)
  const usable = Math.max(0, recv - qtyCredit)
  const total = (Number(line.price_unit ?? 0) + Number(line.freight_unit ?? 0)) * qtyCredit + Number(line.labor_cost ?? 0)
  return { qtyCredit, usable, total }
}

export function creditLabel(c: Pick<CreditSummary, 'id' | 'company_name'>): string {
  return `#${c.id} · ${c.company_name.trim()}`
}

// ── display helpers ───────────────────────────────────────────────────────────
/** 'YYYY-MM-DD' is a calendar date: parse it as local time so it never shifts a day. */
export function parseApiDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  const d = parseApiDate(iso)
  return d ? d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  const d = parseApiDate(iso)
  return d ? d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export function formatQty(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value)
}
