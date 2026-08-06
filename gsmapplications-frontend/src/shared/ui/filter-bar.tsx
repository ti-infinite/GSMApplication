import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

// Estructura FIJA de una barra de filtros (el motor TRX y páginas sueltas como Reportes
// la comparten): shell con toggle mobile + panel de filtros. Lo dinámico es SOLO el
// contenido — cuántos filtros hay, sus labels y sus controles — nunca el layout.
export function FilterBar({ toggleLabel, children }: { toggleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)   // toggle del panel en mobile (en sm+ siempre visible)
  return (
    <div className="flex flex-col gap-3 sm:w-fit">
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/20 sm:hidden"
      >
        <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> {toggleLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${open ? 'flex' : 'hidden'} flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex`}>
        {children}
      </div>
    </div>
  )
}

// Un filtro individual dentro de la FilterBar: label arriba + su control (combo/input/lo que sea).
export function FilterField({ label, children }: { label: ReactNode; children: ReactNode }) {

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-70">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
