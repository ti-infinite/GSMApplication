import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import {
  FLAG_KEYS, FLAG_LABEL_KEY, emptyLineDraft, formatMoney, formatQty, lineDraftToInput, previewThirdPartyLine,
  type DraftProblem, type FlagKey, type LineDraft, type LineNumberField,
} from '@/entities/credit'

interface Props {
  lines: LineDraft[]
  onChange: (lines: LineDraft[]) => void
  problems: DraftProblem[]
  disabled?: boolean
}

type NumField = Extract<LineNumberField, 'qty_received' | 'qty_order' | 'final_yield_oz' | 'temperature' | 'price_unit' | 'freight_unit' | 'labor_cost' | 'box_qty_credit_override'>

// The eight numbers of a line, in reading order: what arrived and its quality first, then the money.
const NUMBER_FIELDS: { key: NumField; label: string; required?: boolean }[] = [
  { key: 'qty_received', label: 'qtyRecv', required: true },
  { key: 'qty_order', label: 'qtyOrder' },
  { key: 'final_yield_oz', label: 'yield', required: true },
  { key: 'temperature', label: 'temp' },
  { key: 'price_unit', label: 'price' },
  { key: 'freight_unit', label: 'freight' },
  { key: 'labor_cost', label: 'labor' },
  { key: 'box_qty_credit_override', label: 'override' },
]

// Every product line of a credit, one card each and nothing to scroll sideways: name / code /
// Finished-Loose on top, the numbers as labeled fields, damage as toggle chips, observations,
// and the live result (credit qty, usable, $) in the panel on the right, computed with the same
// formula the server stores.
export function CreditLinesEditor({ lines, onChange, problems, disabled = false }: Props) {
  const { t } = useTranslation()

  const update = (key: string, patch: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const toggleFlag = (key: string, flag: FlagKey) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, flags: { ...l.flags, [flag]: !l.flags[flag] } } : l)))
  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key))
  const add = () => onChange([...lines, emptyLineDraft()])

  const problemFor = (line: number, field: string): string | null => {
    const p = problems.find((p) =>
      p.line === line &&
      ((p.code === 'productRequired' && field === 'product_name') ||
        (p.code === 'qtyRequired' && field === 'qty_received') ||
        (p.code === 'yieldRange' && field === 'final_yield_oz') ||
        (p.code === 'notANumber' && p.field === field))
    )
    if (!p) return null
    return p.code === 'notANumber' ? t('credits.lines.notANumber') : t(`credits.lines.${p.code}`)
  }

  const previews = lines.map((l) => previewThirdPartyLine(lineDraftToInput(l)))
  const totals = previews.reduce(
    (acc, p) => ({ qty: acc.qty + (p.qtyCredit ?? 0), usable: acc.usable + (p.usable ?? 0), total: acc.total + (p.total ?? 0) }),
    { qty: 0, usable: 0, total: 0 }
  )

  return (
    <div className="flex flex-col gap-4">
      {lines.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{t('credits.lines.empty')}</p>
      )}

      {lines.map((line, i) => {
        const n = i + 1
        const p = previews[i]
        return (
          <div key={line.key} className="rounded-xl border border-border bg-card">
            {/* identity row */}
            <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">{n}</span>
              <Field label={t('credits.lines.product')} className="min-w-56 flex-1" error={problemFor(n, 'product_name')}>
                <Input value={line.product_name} onChange={(e) => update(line.key, { product_name: e.target.value })} disabled={disabled} aria-invalid={!!problemFor(n, 'product_name') || undefined} />
              </Field>
              <Field label={t('credits.lines.code')} className="w-24">
                <Input value={line.code} onChange={(e) => update(line.key, { code: e.target.value })} disabled={disabled} />
              </Field>
              <Field label={t('credits.lines.finLoose')}>
                <div className="flex h-8 overflow-hidden rounded-lg border border-input text-xs font-medium">
                  {(['FINISHED', 'LOOSE'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={disabled}
                      onClick={() => update(line.key, { finished_or_loose: v })}
                      aria-pressed={line.finished_or_loose === v}
                      className={cn('px-3 transition-colors', line.finished_or_loose === v ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-muted')}
                    >
                      {t(`credits.lines.${v === 'FINISHED' ? 'finished' : 'loose'}`)}
                    </button>
                  ))}
                </div>
              </Field>
              <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" onClick={() => remove(line.key)} disabled={disabled} aria-label={t('credits.lines.removeLine')} title={t('credits.lines.removeLine')}>
                <Trash2 className="text-destructive" />
              </Button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_15rem]">
              {/* inputs */}
              <div className="flex min-w-0 flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {NUMBER_FIELDS.map((f) => {
                    const err = problemFor(n, f.key)
                    return (
                      <Field key={f.key} label={<>{t(`credits.lines.${f.label}`)}{f.required && <span className="text-destructive"> *</span>}</>} error={err}>
                        <Input
                          inputMode="decimal"
                          value={line[f.key]}
                          onChange={(e) => update(line.key, { [f.key]: e.target.value } as Partial<LineDraft>)}
                          disabled={disabled}
                          aria-invalid={!!err || undefined}
                          className="text-right font-mono tabular-nums"
                        />
                      </Field>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{t('credits.lines.flags')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {FLAG_KEYS.map((flag) => {
                        const on = line.flags[flag]
                        return (
                          <button
                            key={flag}
                            type="button"
                            disabled={disabled}
                            aria-pressed={on}
                            onClick={() => toggleFlag(line.key, flag)}
                            className={cn(
                              'rounded-md border px-2.5 py-1 text-xs transition-colors',
                              on ? 'border-destructive/30 bg-destructive/10 font-medium text-destructive' : 'border-border text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {t(`credits.flags.${FLAG_LABEL_KEY[flag]}`)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <Field label={t('credits.lines.observations')}>
                    <Input value={line.observations} onChange={(e) => update(line.key, { observations: e.target.value })} disabled={disabled} />
                  </Field>
                </div>
              </div>

              {/* live result */}
              <div className="flex flex-row justify-between gap-3 rounded-lg bg-primary/5 p-4 ring-1 ring-primary/10 lg:flex-col lg:justify-start">
                <Stat label={t('credits.lines.qtyCredit')} value={formatQty(p.qtyCredit)} />
                <Stat label={t('credits.lines.usable')} value={formatQty(p.usable)} />
                <Stat label={t('credits.lines.total')} value={formatMoney(p.total)} strong />
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('credits.lines.totals')}</span>
          <Stat inline label={t('credits.lines.qtyCredit')} value={formatQty(totals.qty)} />
          <Stat inline label={t('credits.lines.usable')} value={formatQty(totals.usable)} />
          <Stat inline label={t('credits.lines.total')} value={formatMoney(totals.total)} strong />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{t('credits.lines.recomputed')}</span>
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
            <Plus /> {t('credits.lines.addLine')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, strong = false, inline = false }: { label: string; value: string; strong?: boolean; inline?: boolean }) {
  if (inline) {
    return (
      <span className="text-sm">
        <span className="text-muted-foreground">{label}: </span>
        <span className={cn('font-mono tabular-nums', strong ? 'font-semibold text-primary' : 'font-medium')}>{value}</span>
      </span>
    )
  }
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-mono tabular-nums', strong ? 'text-xl font-bold text-primary' : 'text-lg font-semibold')}>{value}</p>
    </div>
  )
}
