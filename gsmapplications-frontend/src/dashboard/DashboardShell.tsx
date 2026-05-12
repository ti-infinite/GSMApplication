import { useState, useEffect, useLayoutEffect } from 'react'
import Sidebar, { type MenuOption } from './Sidebar'
import Header from './Header'

type Brand = { name: string; initials: string; logo?: string }

type Props = {
  items: MenuOption[]
  brand: Brand
  locale: string
  userName: string
  onLogout: () => void
  children: React.ReactNode
}

export default function DashboardShell({ items, brand, locale, userName, onLogout, children }: Props) {
  const [open, setOpen] = useState(true)

  useLayoutEffect(() => {
    const saved = localStorage.getItem('gsm_sidebar')
    const mq = window.matchMedia('(max-width: 1023px)')
    if (saved !== null) {
      setOpen(saved === 'true')
    } else if (mq.matches) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function handleToggle() {
    setOpen(prev => {
      const next = !prev
      localStorage.setItem('gsm_sidebar', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <Sidebar items={items} brand={brand} locale={locale} open={open} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header locale={locale} userName={userName} onMenuToggle={handleToggle} />
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
