export type ConfigEntry = {
  CODLANG:   string
  SRC:       string
  TITLE:     string
  SUBTITLE?: string
  DESCR?:    string
  TYPE:      string
  [key: string]: string | undefined
}

export type MediaResource = {
  resourceCategory: string
  resourceOrder:    number
  config:           ConfigEntry[]
}

export function parseConfig(raw: string): ConfigEntry[] {
  try { return JSON.parse(raw) } catch { return [] }
}

export function getLocaleContent(entries: ConfigEntry[], locale: string): ConfigEntry | undefined {
  const lang = locale.toUpperCase()
  return entries.find(e => e.CODLANG === lang)
    ?? entries.find(e => e.CODLANG === 'EN')
    ?? entries[0]
}