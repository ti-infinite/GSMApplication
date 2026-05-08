export type Branding = {
  name: string
  initials: string
  logo?: string
  tagline?: Record<string, string>
}

export const TENANT_IDS: Record<string, string> = {
  en: process.env.NEXT_PUBLIC_TENANT_DEFAULT_EN ?? '',
  es: process.env.NEXT_PUBLIC_TENANT_DEFAULT_ES ?? '',
}

// If the resolve/theme fetch fails, the UI falls back to initials.
export const TENANT_DEFAULTS: Record<string, Branding> = {
  IH: { name: 'Infinite Herbs', initials: 'IH' },
  AG: { name: 'Agroaromas',     initials: 'AG' },
}

export function getBrandingFromCompanyId(companyId: string): Branding {
  const id = companyId.toUpperCase()
  if (id.startsWith('AG')) return TENANT_DEFAULTS.AG
  return TENANT_DEFAULTS.IH
}