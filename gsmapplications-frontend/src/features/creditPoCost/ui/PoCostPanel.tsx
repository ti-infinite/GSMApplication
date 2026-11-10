import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Database, Save } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { INVALID, parseDecimal } from '@/shared/lib/formValidation'
import { formatMoney, formatQty, useLookupPoCost, useSetPoCost, type Credit, type PoCost } from '@/entities/credit'

// What the PO cost on this shipment was: looked up in NHUBEX (credited qty × unit price paid per
// product) or typed in by hand, and how big the credit is against it.
export function PoCostPanel({ credit }: { credit: Credit }) {
  const { t } = useTranslation()
  const lookup = useLookupPoCost()
  const save = useSetPoCost()
  const [result, setResult] = useState<PoCost | null>(null)
  const [paid, setPaid] = useState(credit.po_total_paid === null ? '' : String(credit.po_total_paid))
  const [notes, setNotes] = useState(credit.po_notes ?? '')

  const paidValue = parseDecimal(paid)
  const totalPaid = credit.po_total_paid
  const pct = totalPaid && credit.total_credit_cost ? (credit.total_credit_cost / totalPaid) * 100 : null

  async function doLookup() {
    try {
      const r = await lookup.mutateAsync({ id: credit.id, refresh: true })
      setResult(r)
      if (!r.found) toast.info(t('credits.poCost.notFound'))
    } catch (e) {
      toast.error(t('credits.poCost.failed'), { description: (e as Error).message })
    }
  }
  async function doSave() {
    if (paidValue === INVALID) return
    try {
      await save.mutateAsync({ id: credit.id, body: { po_total_paid: paidValue, po_notes: notes.trim() || null } })
      toast.success(t('credits.poCost.saved'))
    } catch (e) {
      toast.error(t('credits.poCost.failed'), { description: (e as Error).message })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <span className="text-muted-foreground">{t('credits.poCost.source')}: </span>
          <span className="font-medium">{t(`credits.poCost.${credit.po_cost_source}`)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">{t('credits.poCost.paid')}: </span>
          <span className="font-mono font-medium tabular-nums">{formatMoney(totalPaid)}</span>
        </span>
        {credit.credit_dollar_equiv !== null && (
          <span>
            <span className="text-muted-foreground">{t('credits.poCost.creditEquiv')}: </span>
            <span className="font-mono font-medium tabular-nums">{formatMoney(credit.credit_dollar_equiv)}</span>
          </span>
        )}
        {pct !== null && (
          <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
            {t('credits.poCost.creditIs', { pct: `${formatQty(pct, 1)}%` })}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="outline" size="sm" onClick={doLookup} disabled={lookup.isPending || !credit.po_number}>
          <Database /> {lookup.isPending ? t('credits.poCost.looking') : t('credits.poCost.lookup')}
        </Button>
        <Field label={t('credits.poCost.paidInput')} className="w-44" error={paidValue === INVALID ? t('credits.lines.yieldRange') : null}>
          <Input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} className="text-right font-mono tabular-nums" />
        </Field>
        <Field label={t('credits.poCost.notes')} className="min-w-56 flex-1">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button type="button" size="sm" onClick={doSave} disabled={save.isPending || paidValue === INVALID}>
          <Save /> {t('credits.poCost.save')}
        </Button>
      </div>

      {result?.found && result.match && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>{t('credits.poCost.poInNhubex')}: <b className="text-foreground">{result.po_code}</b></span>
            <span>{t('credits.poCost.supplier')}: <b className="text-foreground">{result.supplier}</b></span>
            <span>{t('credits.poCost.paid')}: <b className="font-mono text-foreground">{formatMoney(result.po_total_paid ?? null)}</b></span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>{t('credits.lines.product')}</th>
                <th className="text-right!">{t('credits.poCost.lineLbs')}</th>
                <th className="text-right!">{t('credits.poCost.unitPaid')}</th>
                <th className="text-right!">{t('credits.poCost.equiv')}</th>
              </tr>
            </thead>
            <tbody>
              {result.match.lines.map((l, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-1.5">{l.product_name}{!l.matched && <span className="ml-2 text-xs text-warning">({t('credits.poCost.noMatch')})</span>}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatQty(l.qty_credit)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatMoney(l.unit_price_paid)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatMoney(l.credit_equiv)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30 font-medium">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">{t('credits.poCost.creditEquiv')}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-primary">{formatMoney(result.match.credit_dollar_equiv)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="px-3 py-2 text-xs text-muted-foreground">{t('credits.poCost.hint')}</p>
        </div>
      )}
    </div>
  )
}
