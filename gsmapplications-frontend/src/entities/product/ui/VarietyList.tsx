import { CheckCircle2 } from 'lucide-react'
import type { ProductVariety } from '../model/types'

/**
 * Selectable list of a product's varieties. Pure presentation; the title text
 * is injected so the entity stays free of any feature's i18n namespace.
 */
export function VarietyList({ title, varieties, selected, onSelect }: {
  title:     string
  varieties: ProductVariety[]
  selected:  ProductVariety | null
  onSelect:  (v: ProductVariety) => void
}) {
  return (
    <>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-1.5">
        {varieties.map(v => (
          <button
            key={v.IdVariety}
            type="button"
            onClick={() => onSelect(v)}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
              selected?.IdVariety === v.IdVariety
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:border-primary/40 text-foreground'
            }`}
          >
            <span className="flex-1">{v.Name}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">x{v.Qty}</span>
            {selected?.IdVariety === v.IdVariety && <CheckCircle2 className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />}
          </button>
        ))}
      </div>
    </>
  )
}
