import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { format, isSameDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

const DATE_FORMAT = 'dd/MM/yyyy'

const DateTrigger = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'> & { open: boolean; filled: boolean; label: ReactNode }>(
  ({ open, filled, label, disabled, className, ...props }, ref) => (
    <button
      ref={ref} type="button" disabled={disabled}
      className={cn(
        'flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-left text-sm transition-all',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-ring',
        open && 'border-ring ring-2 ring-ring',
        filled ? 'pr-8 text-foreground' : 'text-muted-foreground',
        className,
      )}
      {...props}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  ),
)
DateTrigger.displayName = 'DateTrigger'

// Hermano del trigger a propósito: anidado adentro, el click bubblea al trigger del Popover y
// reabre/cierra en vez de solo limpiar.
function ClearButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
    >
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )
}

export function DatePicker({ value, onChange, placeholder, disabled, clearLabel }: {
  value?:       Date
  onChange:     (date: Date | undefined) => void
  placeholder?: string
  disabled?:    boolean
  clearLabel:   string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <DateTrigger open={open} filled={!!value} disabled={disabled} label={value ? format(value, DATE_FORMAT) : placeholder} />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={d => { onChange(d); setOpen(false) }} />
        </PopoverContent>
      </Popover>
      {value && !disabled && <ClearButton onClick={() => onChange(undefined)} label={clearLabel} />}
    </div>
  )
}

/** Rango de fechas. Se elige en el calendario y se confirma con el botón (`applyLabel`). */
export function DateRangePicker({ value, onChange, placeholder, applyLabel, clearLabel, disabled }: {
  value?:       DateRange
  onChange:     (range: DateRange | undefined) => void
  placeholder?: string
  applyLabel:   string
  clearLabel:   string
  disabled?:    boolean
}) {
  const [open,   setOpen]   = useState(false)
  const [staged, setStaged] = useState<DateRange | undefined>(value)
  const label = value?.from
    ? value.to && !isSameDay(value.from, value.to)
      ? `${format(value.from, DATE_FORMAT)} – ${format(value.to, DATE_FORMAT)}`
      : format(value.from, DATE_FORMAT)
    : placeholder
  return (
    <div className="relative">
      <Popover open={open} onOpenChange={o => { setOpen(o); if (o) setStaged(value) }}>
        <PopoverTrigger asChild>
          <DateTrigger open={open} filled={!!value?.from} disabled={disabled} label={label} />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={staged} onSelect={setStaged} />
          <div className="border-t border-border p-2">
            <Button className="w-full" onClick={() => { onChange(staged); setOpen(false) }}>{applyLabel}</Button>
          </div>
        </PopoverContent>
      </Popover>
      {value?.from && !disabled && <ClearButton onClick={() => onChange(undefined)} label={clearLabel} />}
    </div>
  )
}
