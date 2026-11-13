import { useState } from 'react'
import { History, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import type { RuntimeCtx } from '../model/runtimeTypes'
import { TrxDocumentSearch } from './TrxDocumentSearch'

/**
 * Lookup: busca transacciones y carga la elegida con ctx.lookup.
 *   • En un combo (ctx.lookupFixed): tipo fijo; el documento entra al combo aunque ya no salga en su lista.
 *   • En la raíz: tipo fijo en el del propio módulo; sus cantidades se usan como plantilla.
 */
export function TrxLookupDialog({ ctx }: { ctx: RuntimeCtx }) {
  const [open, setOpen] = useState(false)
  const location = ctx.context.location ?? ''

  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
      >
        <History className="h-4 w-4" /> {ctx.t('lookup')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{ctx.t('lookup')}</DialogTitle>
            <DialogDescription>{ctx.t(ctx.lookupFixed ? 'lookupHint' : 'lookupTemplateHint')}</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4">
            <TrxDocumentSearch
              key={open ? location : 'closed'}
              prefix={ctx.lookupPrefix}
              initialLocation={location}
              lockLocation={ctx.locked.has('location')}
              rowActions={trx => (
                <Button
                  variant="ghost" size="sm" className="gap-1.5"
                  onClick={() => { ctx.lookup(trx.trxDocument ?? '', trx.location ?? undefined); setOpen(false) }}
                >
                  <Upload className="h-3.5 w-3.5" /> {ctx.t('load')}
                </Button>
              )}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
