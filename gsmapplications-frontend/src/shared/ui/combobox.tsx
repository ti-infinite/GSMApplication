import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'

export interface ComboboxOption {
  value:        string
  label:        string
  description?: string
  badge?:       string
}

interface ComboboxProps {
  options:       ComboboxOption[]
  value:         string
  onChange:      (value: string) => void
  placeholder?:  string
  disabled?:     boolean
  emptyMessage?: string
  renderOption?: (option: ComboboxOption) => ReactNode
  size?:         'default' | 'sm'
}

const MARGIN = 4

interface DropdownPos {
  top?:    number
  bottom?: number
  left:    number
  width:   number
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder  = 'Selecciona una opcion',
  disabled     = false,
  emptyMessage = 'Sin resultados',
  renderOption,
  size         = 'default',
}: ComboboxProps) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const [pos,   setPos]   = useState<DropdownPos | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)
  const listRef      = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  // Show selected label when closed, query when open
  const displayValue = open ? query : (selected?.label ?? '')

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.description?.toLowerCase().includes(query.toLowerCase()),
      )
    : options

  const calcPos = (): DropdownPos | null => {
    if (!containerRef.current) return null
    const rect       = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    if (spaceBelow < 240 && spaceAbove > spaceBelow) {
      return { bottom: window.innerHeight - rect.top + MARGIN, left: rect.left, width: rect.width }
    }
    return { top: rect.bottom + MARGIN, left: rect.left, width: rect.width }
  }

  const openDropdown = () => {
    if (disabled) return
    const p = calcPos()
    if (p) { setPos(p); setOpen(true); setQuery('') }
  }

  const closeDropdown = () => { setOpen(false); setQuery(''); setPos(null) }

  const handleSelect = (optValue: string) => {
    onChange(optValue)
    closeDropdown()
    inputRef.current?.blur()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    if (!open) openDropdown()
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const update = () => { const p = calcPos(); if (p) setPos(p) }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node) || dropdownRef.current?.contains(e.target as Node)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // El listener de 'scroll' de arriba usa capture:true, así que TAMBIÉN se dispara con el
  // scroll interno de esta misma lista y fuerza un re-render (setPos) a mitad de la apertura —
  // eso podía dejar la lista arrancando con scrollTop > 0 (primera fila cortada). Se fuerza
  // explícitamente a 0 en cada apertura.
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: 0 })
  }, [open])

  return (
    <>
      <div ref={containerRef}
        className={[
          `flex items-center gap-2 rounded-lg border bg-card transition-all ${size === 'sm' ? 'px-3' : 'px-3.5'}`,
          disabled ? 'cursor-not-allowed opacity-50 border-border' : 'cursor-text border-border hover:border-ring',
          open ? 'border-ring ring-2 ring-ring' : '',
        ].join(' ')}
        onClick={() => { if (!open) openDropdown(); inputRef.current?.focus() }}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={e => { if (!open) openDropdown(); setQuery(e.target.value) }}
          onFocus={() => { if (!open) openDropdown() }}
          className={`min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed ${size === 'sm' ? 'py-1.5' : 'py-2.5'}`}
        />

        {value && !disabled && (
          <button type="button" onClick={handleClear}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && pos && createPortal(
        <div ref={dropdownRef}
          // Frena el mousedown ACÁ: si el combo vive dentro de un Dialog (Radix), su propio
          // detector de "click afuera" corre a nivel de documento y este dropdown es un portal
          // SEPARADO (no un hijo real del DialogContent) — sin esto, Radix lo trata como
          // "afuera" e interfiere antes de que la opción reciba el click (seleccionaba lo que
          // hubiera DETRÁS del dropdown, ej. una fila de la tabla).
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top:    pos.top    !== undefined ? pos.top    : undefined,
            bottom: pos.bottom !== undefined ? pos.bottom : undefined,
            left:   pos.left,
            width:  pos.width,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-xl border border-border bg-popover shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5"
        >
          <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
              filtered.map(opt => (
                <button key={opt.value} type="button"
                  onMouseDown={e => { e.preventDefault(); handleSelect(opt.value) }}
                  className={[
                    'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors',
                    opt.value === value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60',
                  ].join(' ')}
                >
                  <div className="min-w-0 flex-1">
                    {renderOption ? renderOption(opt) : (
                      <>
                        {/* El popover mide lo mismo que el combo (ancho fijo del filtro) — un
                            label largo no lo agranda, se envuelve a 2 líneas en vez de truncar. */}
                        <p className="font-medium">{opt.label}</p>
                        {opt.description && <p className="text-xs text-muted-foreground">{opt.description}</p>}
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {opt.badge && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{opt.badge}</span>}
                    {opt.value === value && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
