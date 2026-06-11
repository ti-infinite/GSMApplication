import { useState, useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import type { MenuOption } from '@/shared/lib/menu'

const MOBILE_QUERY = '(max-width: 1023px)'

type Brand = { name: string; initials: string; logo?: string }

type Props = {
  items:    MenuOption[]
  brand:    Brand
  locale:   string
  userName: string
  onLogout: () => void
  children: React.ReactNode
}

export default function DashboardShell({ items, brand, locale, userName, onLogout, children }: Props) {
  const [open, setOpen] = useState(true)
  const { pathname } = useLocation()

  // Initial state: on mobile always start collapsed (it's an overlay);
  // on desktop restore the saved preference.
  useLayoutEffect(() => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setOpen(false)
    } else {
      const saved = localStorage.getItem('gsm_sidebar')
      if (saved !== null) setOpen(saved === 'true')
    }
  }, [])

  // Collapse when the viewport shrinks into mobile.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // On mobile, close the overlay after navigating to a menu option.
  useEffect(() => {
    if (window.matchMedia(MOBILE_QUERY).matches) setOpen(false)
  }, [pathname])

  function handleToggle() {
    setOpen(prev => {
      const next = !prev
      // Persist only on desktop, so the mobile overlay toggle doesn't
      // overwrite the desktop preference (they stay independent).
      if (!window.matchMedia(MOBILE_QUERY).matches) {
        localStorage.setItem('gsm_sidebar', String(next))
      }
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay — kept mounted so it can fade in/out instead of popping. */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <Sidebar items={items} brand={brand} locale={locale} open={open} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header locale={locale} userName={userName} menuOpen={open} onMenuToggle={handleToggle} onLogout={onLogout} />
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}