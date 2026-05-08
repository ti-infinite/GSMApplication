'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/lib/actions/auth'
import { isSafeUrl } from '@/app/lib/utils'
import {
  ChevronRight, LogOut,
  House, LayoutDashboard, CreditCard, Wallet, Package,
  Users, User, Settings, Hammer, Boxes, BookOpen,
  BarChart2, ClipboardList, FileText, FileCheck, FilePlus,
  Leaf, GitBranch, Scroll, Map, Star, type LucideIcon,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
export type MenuOption = {
  Description: string
  IdObject?: string
  Icon?: string
  Route?: string
  Section?: string   // "menu" | "others" (case-insensitive)
  IsNew?: boolean
  Children?: MenuOption[]
}

type Brand = { name: string; initials: string; logo?: string }

// ── Icon map ─────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  // IH + AG
  'house':            House,
  'layout-dashboard': LayoutDashboard,
  'package':          Package,
  'users':            Users,
  'user':             User,
  'settings':         Settings,
  'credit-card':      CreditCard,
  'clipboard-list':   ClipboardList,
  'map':              Map,
  // IH only
  'hammer':           Hammer,
  'boxes':            Boxes,
  'book-open':        BookOpen,
  'bar-chart-2':      BarChart2,
  'file-text':        FileText,
  'file-check':       FileCheck,
  'file-plus':        FilePlus,
  // AG only
  'wallet':           Wallet,
  'leaf':             Leaf,
  'git-branch':       GitBranch,
  'scroll':           Scroll,
}

function getIcon(name?: string): LucideIcon {
  if (!name) return Star
  return ICON_MAP[name] ?? Star
}

// ── SimpleItem ───────────────────────────────────────────────
function SimpleItem({
  item, locale, collapsed,
}: {
  item: MenuOption; locale: string; collapsed: boolean
}) {
  const pathname = usePathname()
  const href = item.Route ? `/${locale}${item.Route}` : '#'
  const isActive = item.Route ? pathname === `/${locale}${item.Route}` : false
  const Icon = getIcon(item.Icon ?? item.Description)

  const base = `flex items-center rounded-lg transition-colors ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
  }`

  if (collapsed) {
    return (
      <Link href={href} title={item.Description} className={`${base} justify-center p-2`}>
        <Icon className="h-5 w-5 shrink-0" />
      </Link>
    )
  }

  return (
    <Link href={href} className={`${base} gap-3 px-3 py-2 text-sm font-medium`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.Description}</span>
      {item.IsNew && (
        <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
          NEW
        </span>
      )}
    </Link>
  )
}

// ── ComboItem ────────────────────────────────────────────────
function ComboItem({
  item, locale, expanded, onToggle, collapsed,
}: {
  item: MenuOption; locale: string; expanded: boolean; onToggle: () => void; collapsed: boolean
}) {
  const Icon = getIcon(item.Icon ?? item.Description)

  if (collapsed) {
    return (
      <div
        title={item.Description}
        className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground/40"
      >
        <Icon className="h-5 w-5 shrink-0" />
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{item.Description}</span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
          {item.Children?.map(child => (
            <SimpleItem key={child.Description} item={child} locale={locale} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sidebar ──────────────────────────────────────────────────
type Props = {
  items: MenuOption[]
  brand: Brand
  locale: string
  open?: boolean
}

export default function Sidebar({ items, brand, locale, open = true }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const collapsed = !open

  function toggle(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const isOther = (i: MenuOption) => i.Section?.toLowerCase() === 'others'
  const isExit  = (i: MenuOption) => ['exit', 'salir', 'logout'].includes(i.Description.toLowerCase())

  const menuItems  = items.filter(i => !isOther(i) && !isExit(i))
  const otherItems = items.filter(isOther)

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:relative lg:inset-y-auto lg:left-auto lg:z-auto ${open ? 'w-55 translate-x-0' : 'w-55 -translate-x-full lg:w-16 lg:translate-x-0'}`}>

      {/* Brand */}
      <div className={`flex items-center gap-3 py-4 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${brand.logo && isSafeUrl(brand.logo) ? '' : 'bg-primary'}`}>
          {brand.logo && isSafeUrl(brand.logo) ? (
            <img src={brand.logo} alt={brand.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-primary-foreground">{brand.initials}</span>
          )}
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-sidebar-foreground">{brand.name}</span>
        )}
      </div>

      {/* Scrollable nav */}
      <nav className={`flex flex-1 flex-col overflow-y-auto pb-4 ${collapsed ? 'px-2' : 'px-3'}`}>

        {!collapsed && (
          <p className="mb-1.5 mt-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Menu
          </p>
        )}

        <div className="flex flex-col gap-0.5">
          {menuItems.map(item =>
            item.Children && item.Children.length > 0 ? (
              <ComboItem
                key={item.Description}
                item={item}
                locale={locale}
                collapsed={collapsed}
                expanded={expanded.has(item.Description)}
                onToggle={() => toggle(item.Description)}
              />
            ) : (
              <SimpleItem key={item.Description} item={item} locale={locale} collapsed={collapsed} />
            )
          )}
        </div>

        {/* Exit */}
        <form action={logout} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            title="Exit"
            className={`flex w-full items-center rounded-lg transition-colors text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground ${
              collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-sm font-medium'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Exit</span>}
          </button>
        </form>

        {/* OTHERS section */}
        {otherItems.length > 0 && (
          <>
            {!collapsed && (
              <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Others
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-sidebar-border" />}
            <div className="flex flex-col gap-0.5">
              {otherItems.map(item =>
                item.Children && item.Children.length > 0 ? (
                  <ComboItem
                    key={item.Description}
                    item={item}
                    locale={locale}
                    collapsed={collapsed}
                    expanded={expanded.has(item.Description)}
                    onToggle={() => toggle(item.Description)}
                  />
                ) : (
                  <SimpleItem key={item.Description} item={item} locale={locale} collapsed={collapsed} />
                )
              )}
            </div>
          </>
        )}
      </nav>
    </aside>
  )
}
