import { env } from '@/shared/config/env'

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

export const AVAILABLE_TENANT_IDS: string[] = env.tenantIds

export const DEFAULT_TENANT_ID: string = env.tenantDefault

export function getBrandingFromCompanyId(companyId: string): Branding {
  const prefix = companyId.toUpperCase().substring(0, 2)
  return TENANT_DEFAULTS[prefix] ?? { name: companyId, initials: prefix }
}