import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import Cookies from 'js-cookie'
import { ResponsiveIframe } from '@/components/ui/responsive-iframe'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

type ConfigEntry = {
  CODLANG:  string
  SRC:      string
  TITLE:    string
  SUBTITLE: string
  DESCR:    string
  TYPE:     string
}

type MediaItem = {
  resourceCategory: string
  resourceOrder:    number
  config:           ConfigEntry[]
}

type RawItem = {
  resourceCategory: string
  resourceOrder:    number
  config:           string
}

function parseConfig(raw: string): ConfigEntry[] {
  try { return JSON.parse(raw) } catch { return [] }
}

function getLocaleContent(entries: ConfigEntry[], locale: string): ConfigEntry | undefined {
  const lang = locale.toUpperCase()
  return entries.find(e => e.CODLANG === lang)
    ?? entries.find(e => e.CODLANG === 'EN')
    ?? entries[0]
}

function ItemViewer({ content }: { content: ConfigEntry }) {
  const type = content.TYPE?.toLowerCase()

  if (!content.SRC) return null

  if (type === 'url') {
    return (
      <a
        href={content.SRC}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <ExternalLink className="h-4 w-4" />
        Open
      </a>
    )
  }

  return <ResponsiveIframe src={content.SRC} title={content.TITLE} maxHeight="none" />
}

function Section({
  i18nPrefix, items, locale, dotColor,
}: {
  i18nPrefix: string
  items:      MediaItem[]
  locale:     string
  dotColor:   string
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState<MediaItem | null>(null)
  const activeContent = active ? getLocaleContent(active.config, locale) : null

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <p className="font-semibold text-foreground">{t(`${i18nPrefix}.title`)}</p>
          <p className="text-xs text-muted-foreground">{t(`${i18nPrefix}.subtitle`)}</p>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">—</div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => {
              const lc = getLocaleContent(item.config, locale)
              return (
                <li
                  key={item.resourceOrder}
                  onClick={() => setActive(item)}
                  className="flex cursor-pointer items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{lc?.TITLE || lc?.DESCR || ''}</p>
                    {lc?.SUBTITLE && (
                      <p className="truncate text-xs text-muted-foreground">{lc.SUBTITLE}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeContent?.TITLE || activeContent?.DESCR || ''}</DialogTitle>
            {activeContent?.DESCR && (
              <DialogDescription>{activeContent.DESCR}</DialogDescription>
            )}
          </DialogHeader>
          <div className="px-4 pb-4 pt-3">
            {activeContent && <ItemViewer content={activeContent} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

type Props = { locale: string }

export default function DashboardActivity({ locale }: Props) {
  const token = Cookies.get('gsm_token') ?? ''

  const [activity, setActivity] = useState<MediaItem[]>([])
  const [news,     setNews]     = useState<MediaItem[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          '/api/application/v1/Application/getMediaResources?categories=ACTIVITY&categories=NEWS',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) return
        const data: RawItem[] = await res.json()
        const parsed = data.map(r => ({ ...r, config: parseConfig(r.config) }))
        setActivity(parsed.filter(r => r.resourceCategory.toUpperCase() === 'ACTIVITY'))
        setNews(parsed.filter(r => r.resourceCategory.toUpperCase() === 'NEWS'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className="mt-6 grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-64 rounded-xl bg-muted lg:col-span-3" />
        <div className="h-64 rounded-xl bg-muted lg:col-span-2" />
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section i18nPrefix="activity" items={activity} locale={locale} dotColor="bg-primary" />
      <Section i18nPrefix="news" items={news} locale={locale} dotColor="bg-secondary" />
    </div>
  )
}