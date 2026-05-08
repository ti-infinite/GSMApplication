'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { resolveCompany, persistCompany } from '@/app/lib/actions/tenant'
import type { Branding } from '@/app/lib/tenants'

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
  const [companyId, setCompanyId]   = useState(initialCompanyId)
  const [branding,  setBranding]    = useState<Branding>(initialBranding)
  const [resolving, setResolving]   = useState(false)
  const [themeVars, setThemeVars]   = useState<Record<string, string>>({})

  // Apply inline CSS vars whenever tenant changes client-side.
  // Server already injected a <style> tag; inline vars override it for dynamic switches.
  useEffect(() => {
    const keys = Object.keys(themeVars)
    if (keys.length === 0) return
    const root = document.documentElement
    keys.forEach(k => root.style.setProperty(k, themeVars[k]))
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
      // Sync html[data-tenant] so the server-injected <style> selector stays aligned
      document.documentElement.setAttribute('data-tenant', slug)
      await persistCompany(trimmed)
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