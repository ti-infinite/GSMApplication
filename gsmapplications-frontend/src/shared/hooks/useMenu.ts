import { useTranslation } from 'react-i18next'
import { isSessionActive } from '@/shared/lib/auth'
import type { MenuOption } from '@/shared/lib/menu'
import { useGetMenu } from '@/shared/api/application/endpoints'
import type { GetMenuDtoApiResponse } from '@/shared/api/application/model'

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
  isError:    boolean
}

export function useMenu(): UseMenuResult {
  const { t } = useTranslation()

  const { data: rawItems = [], isLoading, isError } = useGetMenu({
    query: {
      queryKey:  ['menu'],
      staleTime: 5 * 60 * 1000,
      enabled:   isSessionActive(),
      select:    (response) => parseMenu((response.data as GetMenuDtoApiResponse).data?.menu ?? ''),
    },
  })

  const translateItem = (item: MenuOption): MenuOption => ({
    ...item,
    Description: item.IdObject
      ? t(`menu.${item.IdObject}`, { defaultValue: item.Description })
      : item.Description,
    Children: item.Children?.map(translateItem),
  })
  const translated = rawItems.map(translateItem)
 

  const flatten = (items: MenuOption[]): MenuOption[] =>
    items.flatMap(i => [i, ...flatten(i.Children ?? [])])
  const allItems = flatten(translated)

  return {
    menuItems:  translated,
    shortcuts:  allItems.filter(i => i.IsShortcut),
    allOptions: allItems,
    loading:    isLoading,
    isError,
  }
}