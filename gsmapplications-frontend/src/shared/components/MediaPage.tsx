import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { getToken } from '@/shared/lib/auth'
import { type ConfigEntry, type MediaResource, parseConfig, getLocaleContent } from '@/shared/lib/mediaConfig'
import { useGetMediaResources } from '@/shared/api/application/application/application'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { ResponsiveIframe } from '@/shared/ui/responsive-iframe'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

function ResourceViewer({ content, title }: { content: ConfigEntry; title: string }) {
  const type = content.TYPE?.toLowerCase()

  if (!content.SRC) return null

  if (type === 'pdf') {
    const isDirectPdf = content.SRC.toLowerCase().includes('.pdf')
    return isDirectPdf
      ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">{content.DESCR || title}</p>
          <a
            href={content.SRC}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" />
            Open PDF
          </a>
        </div>
      )
      : <ResponsiveIframe src={content.SRC} title={title} />
  }

  if (type === 'url') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">{content.DESCR || title}</p>
        <a
          href={content.SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" />
          Open Resource
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {content.SUBTITLE && (
            <p className="truncate text-xs text-muted-foreground">{content.SUBTITLE}</p>
          )}
        </div>
        <a
          href={content.SRC}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-3 shrink-0 rounded-md border border-primary/20 bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <ResponsiveIframe src={content.SRC} title={title} />
    </div>
  )
}

type MediaPageProps = {
  category:   string
  i18nPrefix: string
}

export function MediaPage({ category, i18nPrefix }: MediaPageProps) {
  const { locale = 'en' } = useParams<{ locale: string }>()
  const { t }   = useTranslation()
  const [selected, setSelected] = useState(0)

  const { data: resources = [], isLoading: loading } = useGetMediaResources(
    { categories: [category] },
    {
      query: {
        staleTime: 2 * 60 * 1000,
        enabled:   !!getToken(),
        select: (response) => (response.data.data ?? []).map(r => ({
          resourceCategory: r.resourceCategory ?? '',
          resourceOrder:    r.resourceOrder    ?? 0,
          config:           parseConfig(r.config ?? ''),
        })),
      },
    },
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    )
  }

  if (resources.length === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        {t(`${i18nPrefix}.noResources`)}
      </div>
    )
  }

  const active  = resources[selected]
  const content = getLocaleContent(active.config, locale)
  const title   = content?.TITLE || content?.DESCR || ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t(`${i18nPrefix}.title`)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(`${i18nPrefix}.subtitle`)}</p>
      </div>

      <div className="flex items-center gap-1.5 md:hidden">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          ← {t('common.swipeHint')} →
        </span>
      </div>

      <TooltipProvider>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {resources.map((r, i) => {
            const lc      = getLocaleContent(r.config, locale)
            const label   = lc?.TITLE || lc?.DESCR || ''
            const tooltip = lc?.DESCR
            return (
              <Tooltip key={r.resourceOrder}>
                <TooltipTrigger asChild>
                  <Button
                    variant={selected === i ? 'default' : 'ghost'}
                    onClick={() => setSelected(i)}
                    className={`shrink-0 rounded-lg ${
                      selected === i
                        ? ''
                        : 'bg-primary/10 text-primary/70 hover:bg-primary/20 hover:text-primary'
                    }`}
                  >
                    {label}
                  </Button>
                </TooltipTrigger>
                {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>

      {content?.SRC ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ResourceViewer content={content} title={title} />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
          {t(`${i18nPrefix}.noResources`)}
        </div>
      )}
    </div>
  )
}