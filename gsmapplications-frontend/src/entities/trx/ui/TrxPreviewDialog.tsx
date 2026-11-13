import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { useTenant } from '@/app/providers/TenantProvider'
import type { TrxResponseDTO } from '@/shared/api/operations/model'
import { pivotAttributes } from '../model/attributes'
import { formatMoney } from '../model/money'

// Solo la fecha (sin hora) en la zona horaria LOCAL — trxDate llega en ISO/UTC.
export const dateOnly = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '')

const titleCase = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()).trim()

const MONEY_ATTR_KEYS = new Set(['price', 'unitPrice', 'productTotal', 'priceQty'])
const formatAttrValue = (key: string, value: string) =>
  MONEY_ATTR_KEYS.has(key) && value !== '' && !Number.isNaN(Number(value)) ? formatMoney(Number(value)) : value

export function TrxPreviewDialog({ trx, onClose, locationName, supplierName, documentTypeName }: {
  trx: TrxResponseDTO | null; onClose: () => void
  locationName: (code?: string | null) => string; supplierName: (id?: string) => string; documentTypeName: string
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'reports' })
  const { t: tTrx } = useTranslation(undefined, { keyPrefix: 'trx' })
  const translateKey = (k: string) => tTrx(k, { defaultValue: titleCase(k) })
  const { branding } = useTenant()
  if (!trx) return null
  const headerAttrs = Object.entries(pivotAttributes(trx.trxAttributes))
    .filter(([, v]) => v !== '')
    .map(([k, v]) => k === 'idSupplier'
      ? { key: k, label: t('supplier'), value: supplierName(v) || v }
      : { key: k, label: translateKey(k), value: v })
  const products = (trx.trxProducts ?? []).map(p => ({
    name:  p.varietyName ?? p.sku ?? '—',
    qty:   p.qty != null ? `${p.qty}${p.measurementUnit ? ' ' + p.measurementUnit : ''}` : '',
    attrs: pivotAttributes(p.trxProductAttributes),
  }))
  const columnKeys = Array.from(new Set(products.flatMap(p => Object.keys(p.attrs))))

  // Document body (fuera del Dialog/Portal de Radix)
  // que es la que efectivamente se imprime — ver comentario en @media print más abajo.
  const docBody = (
    <>
      <div className="rpt-header">
        <div className="rpt-brand">
          {branding.logo ? (
            <img src={branding.logo} alt="" className="rpt-logo" />
          ) : (
            <span className="rpt-logo rpt-logo-fallback">{branding.initials}</span>
          )}
          <div>
            <p className="rpt-eyebrow">{branding.name || t('title')}</p>
            <p className="rpt-title">{documentTypeName}</p>
          </div>
        </div>
        <div className="rpt-docnum-block">
          <p className="rpt-eyebrow">{t('document')}</p>
          <p className="rpt-docnum">{trx.trxDocument}</p>
        </div>
      </div>
      <div className="rpt-accent" />
      <div className="rpt-meta">
        <div><span className="rpt-meta-k">{t('date')}</span><span className="rpt-meta-v">{dateOnly(trx.trxDate) || '—'}</span></div>
        <div><span className="rpt-meta-k">{t('location')}</span><span className="rpt-meta-v">{locationName(trx.location) || '—'}</span></div>
        <div><span className="rpt-meta-k">{t('status')}</span><span className="rpt-meta-v">{trx.status ?? '—'}</span></div>
      </div>

      <div className="rpt-body">
        {headerAttrs.length > 0 && (
          <>
            <p className="rpt-section">{t('details')}</p>
            <div className="rpt-attrs">
              {headerAttrs.map(a => (
                <div key={a.key} className="rpt-attr">
                  <span className="rpt-meta-k">{a.label}</span>
                  <span className="rpt-attr-v">{a.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="rpt-section">{t('lines')}</p>
        {products.length === 0 ? (
          <p className="rpt-empty">{t('noResults')}</p>
        ) : (
          <table className="rpt-table">
            <thead>
              <tr>
                <th>{t('variety')}</th>
                <th className="num">{t('qty')}</th>
                {columnKeys.map(k => <th key={k} className="num">{translateKey(k)}</th>)}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i}>
                  <td className="rpt-name">{p.name}</td>
                  <td className="num">{p.qty || '—'}</td>
                  {columnKeys.map(k => <td key={k} className="num">{p.attrs[k] ? formatAttrValue(k, p.attrs[k]) : '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rpt-footer">
        <span>{t('title')}</span>
        <span>{trx.trxDocument} · {trx.username ?? ''}</span>
      </div>
    </>
  )

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 print:hidden">
        <div className="max-h-[85vh] overflow-y-auto">{docBody}</div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> {t('download')}
          </Button>
        </div>
      </DialogContent>
      {createPortal(
        <div id="trx-print-root" className="hidden print:block">{docBody}</div>,
        document.body
      )}
      <style>{`
        .rpt-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; background: var(--primary); padding: 18px 24px; }
        .rpt-brand { display: flex; align-items: center; gap: 12px; }
        .rpt-logo { width: 40px; height: 40px; border-radius: 8px; object-fit: contain; flex-shrink: 0; }
        .rpt-logo-fallback { display: flex; align-items: center; justify-content: center; background: color-mix(in oklch, var(--primary-foreground) 18%, transparent); color: var(--primary-foreground); font-size: 13px; font-weight: 700; }
        .rpt-eyebrow { margin: 0; color: color-mix(in oklch, var(--primary-foreground) 80%, transparent); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; }
        .rpt-title { margin: 2px 0 0; color: var(--primary-foreground); font-size: 19px; font-weight: 700; }
        /* margin-right: deja hueco para el botón de cerrar (absolute, top-right) del Dialog —
           sin esto "DOCUMENTO"/el número quedan debajo del X. */
        .rpt-docnum-block { text-align: right; margin-right: 40px; }
        .rpt-docnum { margin: 2px 0 0; color: var(--primary-foreground); font-size: 15px; font-weight: 700; white-space: nowrap; }
        .rpt-accent { height: 3px; background: var(--secondary); }
        .rpt-meta { display: flex; background: var(--muted); border-bottom: 1px solid var(--border); }
        .rpt-meta > div { flex: 1; padding: 10px 24px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 1px; }
        .rpt-meta > div:last-child { border-right: none; }
        .rpt-meta-k { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted-foreground); }
        .rpt-meta-v { font-size: 13px; font-weight: 700; color: var(--primary); }
        .rpt-body { padding: 20px 24px; }
        .rpt-section { margin: 0 0 10px; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--primary); border-bottom: 1.5px solid var(--primary); padding-bottom: 5px; }
        .rpt-attrs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
        .rpt-attr { background: color-mix(in oklch, var(--primary) 12%, var(--card)); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; display: flex; flex-direction: column; gap: 1px; }
        .rpt-attr-v { font-size: 12px; font-weight: 700; color: var(--primary); }
        .rpt-empty { padding: 16px; text-align: center; color: var(--muted-foreground); font-style: italic; background: var(--muted); border: 1px solid var(--border); border-radius: 8px; }
        .rpt-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .rpt-table th { background: var(--primary); color: var(--primary-foreground); text-align: left; font-size: 10px; letter-spacing: 0.5px; font-weight: 700; padding: 9px 12px; }
        .rpt-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--foreground); }
        .rpt-table tbody tr:nth-child(even) td { background: var(--muted); }
        .rpt-table tbody tr:last-child td { border-bottom: none; }
        .rpt-table th.num, .rpt-table td.num { text-align: right; white-space: nowrap; }
        .rpt-name { font-weight: 700; color: var(--primary); }
        .rpt-footer { display: flex; justify-content: space-between; padding: 10px 24px 18px; border-top: 1px solid var(--border); font-size: 9px; color: var(--muted-foreground); }
        /* #trx-print-root vive en un portal aparte, colgado directo de <body> (fuera del
           Portal/Overlay/transform de Radix Dialog) — así no hereda ningún position:fixed
           ni transform raro. Solo hay que ocultar el resto de la app (#root) y forzar que
           los fondos de color SÍ se impriman (Chrome los omite por defecto). */
        @media print {
          #root { display: none !important; }
          #trx-print-root, #trx-print-root * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </Dialog>
  )
}
