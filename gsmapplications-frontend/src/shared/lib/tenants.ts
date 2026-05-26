export type Branding = {
  name: string
  initials: string
  logo?: string
  tagline?: Record<string, string>
}

const TENANT_DEFAULTS: Record<string, Branding> = {
  IH: { name: 'Infinite Herbs', initials: 'IH' },
  AG: { name: 'Agroaromas',     initials: 'AG' },
}

export const AVAILABLE_TENANT_IDS: string[] = (import.meta.env.VITE_TENANT_IDS ?? '')
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean)

export const DEFAULT_TENANT_ID: string =
  import.meta.env.VITE_TENANT_DEFAULT ?? AVAILABLE_TENANT_IDS[0] ?? ''

export function getBrandingFromCompanyId(companyId: string): Branding {
  const prefix = companyId.toUpperCase().substring(0, 2)
  return TENANT_DEFAULTS[prefix] ?? { name: companyId, initials: prefix }
}