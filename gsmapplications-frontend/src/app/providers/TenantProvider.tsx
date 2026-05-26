import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'
import { resolveCompany, persistCompany } from '@/shared/lib/tenant'
import { cacheThemeVars } from '@/shared/lib/theme'
import type { Branding } from '@/shared/lib/tenants'

type TenantCtx = {
  companyId: string
  branding: Branding
  resolving: boolean
  loadTenant: (id: string) => Promise<void>
}

const TenantContext = createContext<TenantCtx | null>(null)

type Props = {
  initialCompanyId: string
  initialBranding: Branding
  children: React.ReactNode
}

export function TenantProvider({ initialCompanyId, initialBranding, children }: Props) {
  const [companyId, setCompanyId] = useState(initialCompanyId)
  const [branding,  setBranding]  = useState<Branding>(initialBranding)
  const [resolving, setResolving] = useState(false)
  const [themeVars, setThemeVars] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialCompanyId) loadTenant(initialCompanyId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const keys = Object.keys(themeVars)
    if (keys.length === 0) return
    const root = document.documentElement
    keys.forEach(k => root.style.setProperty(k, themeVars[k]))
    cacheThemeVars(themeVars)
    return () => keys.forEach(k => root.style.removeProperty(k))
  }, [themeVars])

  async function loadTenant(id: string) {
    const trimmed = id.trim()
    if (!trimmed) return
    setResolving(true)
    const result = await resolveCompany(trimmed)
    setResolving(false)
    if (result.valid) {
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-')
      setCompanyId(trimmed)
      setBranding({ name: result.name, initials: result.initials, logo: result.logo, tagline: result.tagline })
      setThemeVars(result.lightVars)
      document.documentElement.setAttribute('data-tenant', slug)
      persistCompany(trimmed)
    }
  }

  return (
    <TenantContext.Provider value={{ companyId, branding, resolving, loadTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): TenantCtx {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider')
  return ctx
}