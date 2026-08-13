import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

// Estructura FIJA de una barra de filtros (el motor TRX y páginas sueltas como Reportes
// la comparten): shell con toggle mobile + panel de filtros. Lo dinámico es SOLO el
// contenido — cuántos filtros hay, sus labels y sus controles — nunca el layout.
export function FilterBar({ toggleLabel, children }: { toggleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)   // toggle del panel en mobile (en sm+ siempre visible)
  return (
    // inline-flex (hug-content) + self-start: sin self-start, el padre (flex-col) estira esto
    // al 100% por default y el hug-content nunca llega a aplicarse.
    <div className="inline-flex max-w-full flex-col gap-3 self-start">
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/20 sm:hidden"
      >
        <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> {toggleLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'flex' : 'hidden'} flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex sm:flex-row sm:flex-wrap sm:items-end`}>
        {children}
      </div>
    </div>
  )
}

// Un filtro individual: label arriba + su control. `width` override para campos angostos
// (ej. un botón "Opciones" que no debe ocupar los 280px de un combo).
export function FilterField({ label, children, width = 'sm:w-70' }: { label: ReactNode; children: ReactNode; width?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${width}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
