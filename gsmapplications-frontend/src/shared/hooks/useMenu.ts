import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { MenuOption } from '@/shared/lib/menu'

type GetMenuDto = {
  idProfile?: number | null
  menu:       string
}

type MenuResponseDto = {
  success:    boolean
  message:    string
  errorType?: string | null
  data:       GetMenuDto
}

type RawItem = MenuOption & {
  Name?:       string
  ActiveType?: string | null
}

function normalizeItems(items: RawItem[]): MenuOption[] {
  return items
    .map(item => ({
      Description:   item.Description || item.Name || '',
      IdObject:      item.IdObject,
      Icon:          item.Icon         || undefined,
      Route:         item.Route        || undefined,
      ExternalRoute: item.ExternalRoute ?? null,
      ActiveType:    item.ActiveType   ?? null,
      Section:       item.Section      ?? 'menu',
      IsNew:         item.IsNew        ?? false,
      IsShortcut:    item.IsShortcut   ?? false,
      Children:      item.Children ? normalizeItems(item.Children as RawItem[]) : undefined,
    }))
    .sort((a, b) => {
      const aIsHome = a.Route === '/dashboard'
      const bIsHome = b.Route === '/dashboard'
      if (aIsHome) return -1
      if (bIsHome) return  1
      return a.Description.localeCompare(b.Description, undefined, { sensitivity: 'base' })
    })
}

function parseMenu(raw: string): MenuOption[] {
  try {
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed) ? parsed
      : (parsed?.MenuOptions ?? parsed?.menuOptions ?? parsed?.Options ?? [])
    return normalizeItems(items)
  } catch {
    return []
  }
}

type UseMenuResult = {
  menuItems:  MenuOption[]
  shortcuts:  MenuOption[]
  allOptions: MenuOption[]
  loading:    boolean
}

export function useMenu(token: string, locale: string | undefined): UseMenuResult {
  const { t } = useTranslation()

  const [menuItems,  setMenuItems]  = useState<MenuOption[]>([])
  const [shortcuts,  setShortcuts]  = useState<MenuOption[]>([])
  const [allOptions, setAllOptions] = useState<MenuOption[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch('/api/application/v1/Application/getMenu', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const response: MenuResponseDto = await res.json()
        if (!response.success) return

        const items = parseMenu(response.data?.menu ?? '')
        const translated = items.map(item => ({
          ...item,
          Description: item.IdObject
            ? t(`menu.${item.IdObject}`, { defaultValue: item.Description })
            : item.Description,
          Children: item.Children?.map(child => ({
            ...child,
            Description: child.IdObject
              ? t(`menu.${child.IdObject}`, { defaultValue: child.Description })
              : child.Description,
          })),
        }))

        setMenuItems(translated)
        const allItems = translated.flatMap(i => [i, ...(i.Children ?? [])])
        setShortcuts(allItems.filter(i => i.IsShortcut))
        setAllOptions(allItems)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [token, locale, t])

  return { menuItems, shortcuts, allOptions, loading }
}