// Conversión de unidades — FÍSICA, no dominio (universal a todo tenant, no se toca por
// cliente). Base por dimensión: kg (masa) y L (volumen), que son las unidades ESTÁNDAR
// en que se persiste/envía el dato. El `measurementUnit` de la fila (KG/L) ya es la base.
interface UnitDef { dim: 'mass' | 'volume'; label: string; toBase: number }

const UNITS: Record<string, UnitDef> = {
  g:   { dim: 'mass',   label: 'G',   toBase: 0.001 },
  kg:  { dim: 'mass',   label: 'KG',  toBase: 1 },              // base masa
  lb:  { dim: 'mass',   label: 'LB',  toBase: 0.45359237 },
  ml:  { dim: 'volume', label: 'mL',  toBase: 0.001 },
  lt:  { dim: 'volume', label: 'LT',  toBase: 1 },              // base volumen — el backend guarda "LT", no "L"
  gal: { dim: 'volume', label: 'GAL', toBase: 3.785411784 },
}

const norm = (u: string) => u.trim().toLowerCase()


export function unitOptionsFor(measurementUnit: string): { value: string; label: string }[] {
  const base = UNITS[norm(measurementUnit)]
  if (!base) return []
  return Object.entries(UNITS).filter(([, d]) => d.dim === base.dim).map(([value, d]) => ({ value, label: d.label }))
}

/** Valor tecleado → base estándar (kg/L) para el payload */
export function toBaseUnit(value: number, unit: string): number {
  const u = UNITS[norm(unit)]
  if (!u) throw new Error(`Unidad desconocida: "${unit}"`)
  return value * u.toBase
}

/** Base estándar → valor en unit (para mostrar en el input al montar). */
export function fromBaseUnit(baseValue: number, unit: string): number {
  const u = UNITS[norm(unit)]
  return u ? baseValue / u.toBase : baseValue
}
