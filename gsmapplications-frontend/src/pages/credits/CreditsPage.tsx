import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { usePrealerts } from '@/entities/prealert'
import type { CreditSummary } from '@/entities/credit'
import { CreditsKpiCards } from '@/widgets/CreditsKpiCards'
import { CreditsTable } from '@/widgets/CreditsTable'
import { PreAlertsTable } from '@/widgets/PreAlertsTable'
import { CreditSuppliersTable } from '@/widgets/CreditSuppliersTable'

const TABS = ['credits', 'prealerts', 'suppliers'] as const
type Tab = (typeof TABS)[number]

// Credits · Dashboard: one menu entry, three tabs (Credits, Pre-alerts, Suppliers). The tab lives
// in `?tab=` so links from e-mails and the browser's back button land on the right one.
export default function CreditsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'credits'
  const { open: openPrealerts } = usePrealerts({ status: 'open' })
  const [credits, setCredits] = useState<CreditSummary[] | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number>(0)
  const onLoaded = useCallback((items: CreditSummary[], at: number) => { setCredits(items); setUpdatedAt(at) }, [])

  const setTab = (next: string) => {
    const p = new URLSearchParams(params)
    if (next === 'credits') p.delete('tab')
    else p.set('tab', next)
    setParams(p, { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('credits.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('credits.subtitle')}</p>
        </div>
        {updatedAt > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-success" /> {t('credits.common.live')} · {t('credits.common.updated')} {new Date(updatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <TabsList>
          <TabsTrigger value="credits">{t('credits.tabs.credits')}</TabsTrigger>
          <TabsTrigger value="prealerts">
            {t('credits.tabs.prealerts')}
            {openPrealerts > 0 && <span className="ml-2 rounded-md bg-warning/15 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-warning">{openPrealerts}</span>}
          </TabsTrigger>
          <TabsTrigger value="suppliers">{t('credits.tabs.suppliers')}</TabsTrigger>
        </TabsList>

        <TabsContent value="credits" className="mt-6 flex flex-col gap-6">
          <CreditsKpiCards credits={credits ?? []} openPrealerts={openPrealerts} loading={credits === null} onOpenPrealerts={() => setTab('prealerts')} />
          <CreditsTable onLoaded={onLoaded} />
        </TabsContent>
        <TabsContent value="prealerts" className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('credits.prealerts.subtitle')}</p>
          <PreAlertsTable />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('credits.suppliers.subtitle')}</p>
          <CreditSuppliersTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
