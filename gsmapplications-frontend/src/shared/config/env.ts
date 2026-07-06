/**
 * Acceso centralizado a las variables de entorno del cliente (Vite, prefijo `VITE_`).
 * Único lugar que toca `import.meta.env`; el resto del cliente importa de acá.
 *
 * Para agregar una var nueva del cliente:
 *  1. sumarla acá,
 *  2. tiparla en `src/vite-env.d.ts`.
 *
 * Nota: las del `vite.config.ts` (proxies/build) se leen aparte con `loadEnv`,
 * porque ese archivo corre en Node y no tiene `import.meta.env`.
 */

const tenantIds = (import.meta.env.VITE_TENANT_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

export const env = {
  /** Tenants disponibles en el login (lista). */
  tenantIds,
  /** Tenant mostrado por defecto antes de autenticar. */
  tenantDefault: import.meta.env.VITE_TENANT_DEFAULT ?? tenantIds[0] ?? '',
  /** API key del agente IH. ⚠️ queda embebida en el bundle del cliente (no es secreta). */
  ihApiKey: import.meta.env.VITE_IH_API_KEY ?? '',
} as const
