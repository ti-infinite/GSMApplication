import { getValueByPath } from '@/shared/lib/pathResolver'

/**
 * Buscadores por `selectorType` — CENTRAL y genérico (recibe `data`, no solo una
 * fila → sirve para JsonFront, params, o donde sea). El registry del app puede
 * overridear un `type` o agregar uno nuevo (DATE, TEMPLATE…) sin tocar el motor.
 *
 * COMPUTED no va acá: despacha a `registry.computeds` (necesita el registry).
 */
export const DEFAULT_SELECTORS: Record<string, (data: unknown, selectorValue: string) => unknown> = {
  // reduce nativo: "$.data/varietyName" | "data.remaining" | "0/sku". Auto-mapea arrays.
  JSON_PATH: (data, sel) => getValueByPath(data, sel),
  // campo plano directo (sin path)
  FIELD:     (data, sel) => (data as Record<string, unknown> | null)?.[sel] ?? null,
  // literal (constante)
  CONST:     (_data, sel) => sel,
}
