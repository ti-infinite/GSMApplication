// Resolver de paths NATIVO (reduce) — sin jsonpath-plus, cero bundle extra.
// Soporta: "$.data/consumption", "data.remaining", "$.data/0/sku". Auto-mapea arrays.
// NO soporta: filtros ?(@.x==y), recursive descent "..", slicing → esos van al
// backend (que da forma a la data) o a un COMPUTED. Cubre el 99% de los casos.
export function getValueByPath(obj: unknown, path: string): unknown {
  if (obj == null || !path) return null

  const parts = path
    .replace(/^\$\.?/, '')   // quita "$." o "$" inicial
    .replace(/\//g, '.')     // normaliza "/" → "."
    .split('.')
    .filter(Boolean)

  return parts.reduce<unknown>((acc, key) => {
    if (acc == null) return null
    // Array → mapea la key sobre cada elemento
    if (Array.isArray(acc)) {
      const mapped = acc.map(item => (item as Record<string, unknown> | null)?.[key] ?? null)
      return mapped.every(v => v === null) ? null : mapped
    }
    return (acc as Record<string, unknown>)[key] ?? null
  }, obj)
}
