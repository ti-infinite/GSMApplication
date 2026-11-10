import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { WAREHOUSES, type HeaderDraft, type Whs } from '@/entities/credit'

interface Props {
  header: HeaderDraft
  onChange: (header: HeaderDraft) => void
  disabled?: boolean
}

// The shipment header of a credit, always editable in place (company, date, PO, warehouse,
// QA inspector, arrival, AWB, flight, recommendations).
export function CreditHeaderForm({ header, onChange, disabled = false }: Props) {
  const { t } = useTranslation()
  const set = <K extends keyof HeaderDraft>(key: K, value: HeaderDraft[K]) => onChange({ ...header, [key]: value })
  const text = (key: Exclude<keyof HeaderDraft, 'whs'>, type = 'text') => (
    <Input type={type} value={header[key]} onChange={(e) => set(key, e.target.value)} disabled={disabled} />
  )
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label={t('credits.detail.company')} className="sm:col-span-2">{text('company_name')}</Field>
      <Field label={t('credits.detail.date')}>{text('report_date', 'date')}</Field>
      <Field label={t('credits.detail.po')}>{text('po_number')}</Field>
      <Field label={t('credits.detail.whs')}>
        <Combobox
          value={header.whs}
          onChange={(v) => { if (v) set('whs', v as Whs) }}
          disabled={disabled}
          placeholder={t('credits.detail.whs')}
          emptyMessage={t('credits.common.noResults')}
          options={WAREHOUSES.map((w) => ({ value: w.code, label: w.code, description: t(`credits.whs.${w.code}`) }))}
        />
      </Field>
      <Field label={t('credits.detail.qa')}>{text('qa_inspector')}</Field>
      <Field label={t('credits.detail.arrival')}>{text('arrival_time')}</Field>
      <Field label={t('credits.detail.awb')}>{text('awb')}</Field>
      <Field label={t('credits.detail.flight')}>{text('flight')}</Field>
      <Field label={t('credits.detail.recommendations')} className="sm:col-span-2 lg:col-span-3">
        <textarea
          value={header.recommendations}
          onChange={(e) => set('recommendations', e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder={t('credits.detail.recommendationsPlaceholder')}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      </Field>
    </div>
  )
}
