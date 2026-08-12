import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isSafeUrl } from '@/shared/lib/utils'
import { ChevronRight, LogOut } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { type MenuOption, getIcon } from '@/shared/lib/menu'
import NewTabDialog from '@/shared/components/NewTabDialog'

type Brand = { name: string; initials: string; logo?: string }

function SimpleItem({ item, locale, collapsed }: { item: MenuOption; locale: string; collapsed: boolean }) {
  const { pathname } = useLocation()

  if (item.ActiveType === 'newtab') {
    return <NewTabDialog item={item} collapsed={collapsed} />
  }

  const href = item.Route ? `/${locale}${item.Route}` : '#'
  const isActive = item.Route ? pathname === `/${locale}${item.Route}` : false
  const Icon = getIcon(item.Icon)

  const base = `flex items-center rounded-lg transition-colors ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
  }`

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={href} className={`${base} justify-center p-2`}>
            <Icon className="h-5 w-5 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.Description}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link to={href} className={`${base} gap-3 px-3 py-2 text-sm font-medium`}>
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

function hasActiveDescendant(item: MenuOption, locale: string, pathname: string): boolean {
  return !!(item.Children?.some(child =>
    (child.Route && pathname.startsWith(`/${locale}${child.Route}`))
    || hasActiveDescendant(child, locale, pathname)
  ))
}

const keyOf = (it: MenuOption) => it.IdObject ?? it.Description

/** Lista con acordeón: a este nivel, solo UNA sección abierta a la vez. */
function MenuList({ items, locale, collapsed }: { items: MenuOption[]; locale: string; collapsed: boolean }) {
  const { pathname } = useLocation()

  // El sibling cuyo subárbol contiene la ruta activa debe estar abierto.
  const activeKey = useMemo(() => {
    const a = items.find(it => it.Children?.length && hasActiveDescendant(it, locale, pathname))
    return a ? keyOf(a) : null
  }, [items, locale, pathname])

  const [openKey, setOpenKey] = useState<string | null>(activeKey)
  useEffect(() => { if (activeKey) setOpenKey(activeKey) }, [activeKey])

  return (
    <>
      {items.map(item => (
        <MenuItem
          key={keyOf(item)}
          item={item}
          locale={locale}
          collapsed={collapsed}
          expanded={openKey === keyOf(item)}
          onToggle={() => setOpenKey(prev => (prev === keyOf(item) ? null : keyOf(item)))}
        />
      ))}
    </>
  )
}

function ComboItem({ item, locale, collapsed, expanded, onToggle }: {
  item: MenuOption; locale: string; collapsed: boolean; expanded: boolean; onToggle: () => void
}) {
  const Icon = getIcon(item.Icon)

  if (collapsed) {
    return (
      <div className="flex flex-col gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              className={`flex w-full items-center justify-center rounded-lg p-2 transition-colors ${
                expanded
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.Description}</TooltipContent>
        </Tooltip>
        {expanded && <MenuList items={item.Children!} locale={locale} collapsed={true} />}
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
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
          <MenuList items={item.Children!} locale={locale} collapsed={false} />
        </div>
      )}
    </div>
  )
}

function MenuItem({ item, locale, collapsed, expanded, onToggle }: {
  item: MenuOption; locale: string; collapsed: boolean; expanded: boolean; onToggle: () => void
}) {
  return item.Children?.length
    ? <ComboItem item={item} locale={locale} collapsed={collapsed} expanded={expanded} onToggle={onToggle} />
    : <SimpleItem item={item} locale={locale} collapsed={collapsed} />
}

type Props = {
  items: MenuOption[]
  brand: Brand
  locale: string
  open?: boolean
  onLogout: () => void
}

export default function Sidebar({ items, brand, locale, open = true, onLogout }: Props) {
  const { t } = useTranslation()
  const collapsed = !open

  const isOther = (i: MenuOption) => i.Section?.toLowerCase() === 'others'
  const menuItems  = items.filter(i => !isOther(i))
  const otherItems = items.filter(isOther)

  return (
    <TooltipProvider>
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:relative lg:inset-y-auto lg:left-auto lg:z-auto ${open ? 'w-67.5 translate-x-0' : 'w-67.5 -translate-x-full lg:w-16 lg:translate-x-0'}`}>

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

      <nav className={`scrollbar-hide flex flex-1 flex-col overflow-y-auto pb-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="mb-1.5 mt-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Menu
          </p>
        )}

        <div className="flex flex-col gap-0.5">
          <MenuList items={menuItems} locale={locale} collapsed={collapsed} />
        </div>

        <div className="mt-4 flex flex-col gap-0.5">
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Others
            </p>
          )}
          {collapsed && <div className="mb-2 border-t border-sidebar-border" />}

          <MenuList items={otherItems} locale={locale} collapsed={collapsed} />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onLogout}
                className={`flex w-full items-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/20 hover:border-primary/40 ${
                  collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-sm font-medium'
                }`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{t('dashboard.logout')}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">{t('dashboard.logout')}</TooltipContent>}
          </Tooltip>
        </div>
      </nav>
    </aside>
    </TooltipProvider>
  )
}