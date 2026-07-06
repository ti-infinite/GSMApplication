import { LayoutGrid, type LucideIcon } from 'lucide-react'
import * as icons from 'lucide-react'

export type MenuOption = {
  Description:    string
  IdObject?:      string
  Icon?:          string
  Route?:         string
  ExternalRoute?: string | null
  ActiveType?:    string | null
  Section?:       string
  IsNew?:         boolean
  IsShortcut?:    boolean
  Children?:      MenuOption[]
}

export type DashboardOutletCtx = {
  shortcuts:   MenuOption[]
  menuOptions: MenuOption[]
}

/** Primera ruta navegable del subárbol: el nodo, o su primer descendiente con Route. */
export function firstRoute(item: MenuOption): string | undefined {
  if (item.Route) return item.Route
  for (const child of item.Children ?? []) {
    const r = firstRoute(child)
    if (r) return r
  }
  return undefined
}

export function getIcon(name?: string): LucideIcon {
  if (!name) return LayoutGrid
  const pascal = name.includes('-')
    ? name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
    : name.charAt(0).toUpperCase() + name.slice(1)
  const Icon = (icons as Record<string, unknown>)[pascal]
  return (Icon ?? LayoutGrid) as LucideIcon
}