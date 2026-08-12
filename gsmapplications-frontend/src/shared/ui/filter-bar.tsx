import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'

// Estructura FIJA de una barra de filtros (el motor TRX y páginas sueltas como Reportes
// la comparten): shell con toggle mobile + panel de filtros. Lo dinámico es SOLO el
// contenido — cuántos filtros hay, sus labels y sus controles — nunca el layout.
export function FilterBar({ toggleLabel, children }: { toggleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)   // toggle del panel en mobile (en sm+ siempre visible)
  return (
    // `inline-flex` (no `flex w-fit`/`w-full`): hug-content nativo del navegador — 1 campo,
    // se achica; varios, crece — sin la lógica de `width:fit-content()` que resultó poco
    // confiable mezclada con hijos `flex-wrap` (calculaba mal cuánto entraba por fila, ya sea
    // desbordándose de más o quedándose corto). `max-w-full` clampa contra el viewport (un
    // inline-flex, a diferencia de un bloque con fit-content, no se autolimita solo).
    // `self-start`: el padre real (TrxRuntime, el `flex flex-col gap-6` que apila TODAS las
    // secciones del módulo) estira a sus hijos al 100% por default (`align-items:stretch` de
    // flex-col) — sin esto, NADA de lo de acá adentro importaba, el ancho ya venía impuesto
    // desde afuera antes de que el `inline-flex` propio tuviera oportunidad de decidir algo.
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

// Un filtro individual dentro de la FilterBar: label arriba + su control (combo/input/lo que sea).
// `width` (default el ancho fijo de siempre) — override puntual para un campo que no necesita
// ocupar lo mismo que un combo (ej. un botón corto tipo "Opciones": mismo alto que los demás
// vía el label invisible, pero angosto en vez de estirado a 280px — en flex, a diferencia de
// grid, un item respeta este ancho tal cual, sin estirarse solo). Sin `w-full` a propósito: en
// mobile ya estira solo por `align-items:stretch` (default de flex-col, el panel de arriba);
// declararlo además rompía el hug-content del `inline-flex` de arriba (ancho 100% contra un
// contenedor que todavía no tiene ancho propio = comportamiento indefinido en el spec CSS).
export function FilterField({ label, children, width = 'sm:w-70' }: { label: ReactNode; children: ReactNode; width?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${width}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
