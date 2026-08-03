import { getStoredUser } from '@/shared/lib/auth'

/**
 * De DÓNDE sale el objeto BASE del que una columna extrae su valor, según `sourceType`.
 * Después el `selectorType`/`selectorValue` (path) navegan ese base. Extensible (OCP):
 * registrá una fuente nueva en `registry.valueSources` sin tocar el motor.
 */
export interface ValueSourceCtx {
  row:     Record<string, unknown>    // la fila cargada del resource (default)
  context: Record<string, string>     // los filtros elegidos (location, category…)
}

export const DEFAULT_VALUE_SOURCES: Record<string, (c: ValueSourceCtx) => unknown> = {
  INDEXED_DB: ({ row }) => row,                                                   // fila del resource (cache IndexedDB) — default
  MEMORY:     ({ row }) => row,                                                   // dato ya en memoria de la tabla
  API:        ({ row }) => row,                                                   // la respuesta ya vino como filas
  CONTEXT:    ({ context }) => context,                                          // los filtros (location, category…)
  COOKIE:     () => (getStoredUser() as Record<string, unknown> | null) ?? {},   // la cookie del usuario
}
