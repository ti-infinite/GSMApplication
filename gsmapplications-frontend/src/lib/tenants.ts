export type Branding = {
  name: string
  initials: string
  logo?: string
  tagline?: Record<string, string>
}

export const TENANT_IDS: Record<string, string> = {
  en: import.meta.env.VITE_TENANT_DEFAULT_EN ?? '',
  es: import.meta.env.VITE_TENANT_DEFAULT_ES ?? '',
}

export const TENANT_DEFAULTS: Record<string, Branding> = {
  IH: { name: 'Infinite Herbs', initials: 'IH' },
  AG: { name: 'Agroaromas',     initials: 'AG' },
}

export function getBrandingFromCompanyId(companyId: string): Branding {
  const id = companyId.toUpperCase()
  if (id.startsWith('AG')) return TENANT_DEFAULTS.AG
  return TENANT_DEFAULTS.IH
}
