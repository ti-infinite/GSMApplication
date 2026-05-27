import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getToken } from '@/shared/lib/auth'
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

async function fetchMenu(token: string): Promise<MenuOption[]> {
  const res = await fetch('/api/application/v1/Application/getMenu', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  const response: MenuResponseDto = await res.json()
  if (!response.success) throw new Error(response.message)
  return parseMenu(response.data?.menu ?? '')
}

type UseMenuResult = {
  menuItems:  MenuOption[]
  shortcuts:  MenuOption[]
  allOptions: MenuOption[]
  loading:    boolean
  isError:    boolean
}

export function useMenu(): UseMenuResult {
  const { t } = useTranslation()
  const token = getToken()

  const { data: rawItems = [], isLoading, isError } = useQuery({
    queryKey: ['menu', token],
    queryFn:  () => fetchMenu(token),
    staleTime: 5 * 60 * 1000,
    enabled:  !!token,
  })

  const translated = rawItems.map(item => ({
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

  const allItems = translated.flatMap(i => [i, ...(i.Children ?? [])])

  return {
    menuItems:  translated,
    shortcuts:  allItems.filter(i => i.IsShortcut),
    allOptions: allItems,
    loading:    isLoading,
    isError,
  }
}