// Pivote GENÉRICO de atributos de producto: el backend devuelve los atributos de una
// línea como lista key/value (`trxProductAttributes: [{ attributeKey, attributeValue }]`,
// PascalCase). Esto los aplana a campos planos camelCase sobre la fila, para que las
// columnas del JSON los lean con `selectorValue` normal (ej. `remaining`, `consumption`,
// `priceQty`) igual que cualquier otra TRX. Reutilizable: OCM (desde REQ), RCP (desde OCM)…

export interface TrxAttrPair { attributeKey?: string | null; attributeValue?: string | null }

// PascalCase → camelCase (solo la 1ª letra). Idempotente para keys ya en camelCase.
// "Remaining"→"remaining", "Consumption"→"consumption", "PriceQty"→"priceQty".
const toCamel = (s: string): string => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** Aplana los atributos key/value de una línea a un objeto de campos planos (camelCase). */
export function pivotAttributes(attrs: TrxAttrPair[] | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of attrs ?? []) {
    const key = a?.attributeKey
    if (!key) continue
    out[toCamel(key)] = a.attributeValue ?? ''
  }
  return out
}
