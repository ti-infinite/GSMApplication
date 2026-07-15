import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Plus, Trash2, CheckCircle2, XCircle, Copy } from 'lucide-react'
import type { CellRenderCtx } from '../model/runtime'

/**
 * Renderers GENÉRICOS — cómo se dibuja un valor. Reusables por cualquier TRX;
 * un módulo puede overridear un id o agregar el suyo.
 */
export const DEFAULT_RENDERERS: Record<string, (ctx: CellRenderCtx) => ReactNode> = {
  // Pill de estado (colorea por palabras comunes; fallback destructive).
  badge: ({ value }) => {
    const v = String(value)
    const ok   = ['OK', 'Completo', 'Activo'].includes(v)
    const warn = ['Bajo', 'Parcial', 'Pendiente'].includes(v)
    const cls  = ok ? 'bg-green-500/10 text-green-600' : warn ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'
    const dot  = ok ? 'bg-green-500'                    : warn ? 'bg-amber-500'                    : 'bg-destructive'
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {v}
      </span>
    )
  },

  // Valor principal + sub-texto tenue (2 líneas). El sub sale de `field.sub`
  // (ej. Insumo + "FERT-001 · Bulto 50kg").
  titleSub: ({ value, row, field }) => {
    const sub = field.sub ? row[field.sub] : null
    return (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{value == null || value === '' ? '—' : String(value)}</span>
        {sub != null && sub !== '' && <span className="text-xs text-muted-foreground">{String(sub)}</span>}
      </div>
    )
  },

  // Valor con unidad de medida acompañante en `field.sub` → "1250 kg".
  withUnit: ({ value, row, field }) => {
    if (value == null || value === '') return '—'
    const unit = field.sub ? String(row[field.sub] ?? '') : ''
    return <span>{String(value)}{unit ? ` ${unit}` : ''}</span>
  },

  // Valor coloreado por un tono acompañante en `field.sub` ('ok'|'warn'|'bad').
  // Usa tokens del TEMA (theme-ables por tenant): destructive · secondary · chart-1.
  toned: ({ value, row, field }) => {
    const tone = field.sub ? String(row[field.sub] ?? '') : ''
    const cls = tone === 'bad' ? 'text-destructive' : tone === 'warn' ? 'text-secondary' : tone === 'ok' ? 'text-chart-1' : 'text-foreground'
    return <span className={`font-medium ${cls}`}>{value == null || value === '' ? '—' : String(value)}</span>
  },

  // Input numérico editable (edición inline).
  input: ({ value, setValue }) => (
    <input
      type="number" min="0" inputMode="numeric"
      value={value == null || value === '' ? '' : String(value)}
      onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
      placeholder="0"
      className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  ),

  // Input de TEXTO editable (edición inline) — ej. nombre SAP del diccionario.
  textInput: ({ value, setValue }) => (
    <input
      type="text"
      value={value == null ? '' : String(value)}
      onChange={e => setValue(e.target.value)}
      placeholder="—"
      className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  ),

  // Input numérico + botón [＋] al lado → agrega la fila (con su cantidad) a la collection.
  inputAdd: ({ value, row, setValue, collection }) => (
    <div className="flex items-center gap-1.5">
      <input
        type="number" min="0" inputMode="decimal"
        value={value == null || value === '' ? '' : String(value)}
        onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="w-20 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button size="icon" onClick={() => collection.add(row)} disabled={collection.has(String(row.id))} className="h-8 w-8 shrink-0" aria-label="Agregar">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),

  // Input de texto que permite valores NEGATIVOS (ej. ajuste +/− de inventario).
  // `type="text"` a propósito: los number inputs descartan el "-" al tipearlo.
  signedInput: ({ value, setValue }) => (
    <input
      type="text" inputMode="decimal"
      value={value == null || value === '' ? '' : String(value)}
      onChange={e => { let v = e.target.value.replace(/[^0-9.-]/g, ''); if (v.lastIndexOf('-') > 0) v = v.replace(/-/g, ''); setValue(v) }}
      placeholder="±0"
      className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-right text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  ),

  // Como signedInput pero con botón [＋] para agregar la fila a la collection.
  signedInputAdd: ({ value, row, setValue, collection }) => (
    <div className="flex items-center gap-1.5">
      <input
        type="text" inputMode="decimal"
        value={value == null || value === '' ? '' : String(value)}
        onChange={e => { let v = e.target.value.replace(/[^0-9.-]/g, ''); if (v.lastIndexOf('-') > 0) v = v.replace(/-/g, ''); setValue(v) }}
        placeholder="±0"
        className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-right text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button size="icon" onClick={() => collection.add(row)} disabled={value == null || value === '' || Number(value) === 0 || collection.has(String(row.id))} className="h-8 w-8 shrink-0" aria-label="Registrar">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),

  // Row-action: agrega la fila a la collection (carrito).
  addButton: ({ row, collection }) => (
    <Button size="icon" onClick={() => collection.add(row)} disabled={collection.has(String(row.id))} aria-label="Agregar">
      <Plus className="h-4 w-4" />
    </Button>
  ),

  // Row-action: quita la fila de la collection.
  removeButton: ({ row, collection }) => (
    <Button
      variant="ghost" size="icon"
      onClick={() => collection.remove(String(row.id))}
      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label="Quitar"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  ),

  // Aceptar / Rechazar un ítem: setea `estado` en la fila (verificado | rechazado).
  verifyReject: ({ value, row, collection }) => {
    const estado = String(value ?? row.estado ?? 'pendiente')
    const id = String(row.id ?? '')
    return (
      <div className="flex items-center gap-2">
        <Button variant={estado === 'verificado' ? 'default' : 'outline'} size="sm"
          onClick={() => collection.update(id, { estado: 'verificado', comentario: '' })} className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Verificar
        </Button>
        <Button variant={estado === 'rechazado' ? 'destructive' : 'outline'} size="sm"
          onClick={() => collection.update(id, { estado: 'rechazado' })} className="gap-1.5">
          <XCircle className="h-3.5 w-3.5" /> Rechazar
        </Button>
      </div>
    )
  },

  // Duplica la fila con un id NUEVO (dividir presentación / partir una línea).
  // La copia queda marcada `added` → se puede quitar; la original no.
  splitButton: ({ row, collection }) => (
    <Button
      variant="ghost" size="icon"
      onClick={() => collection.add({ ...row, id: `${String(row.id ?? '')}#${Date.now().toString(36)}`, added: true })}
      className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
      aria-label="Dividir" title="Dividir línea"
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  ),

  // Quita la fila SOLO si fue agregada/dividida (`added`). Las originales no se borran.
  removeAdded: ({ row, collection }) => {
    if (!row.added) return null
    return (
      <Button
        variant="ghost" size="icon"
        onClick={() => collection.remove(String(row.id))}
        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Quitar" title="Quitar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    )
  },

  // Comentario de rechazo (fila expandible): solo aparece si estado='rechazado'.
  rejectComment: ({ row, collection }) => {
    if (String(row.estado ?? '') !== 'rechazado') return null
    const id = String(row.id ?? '')
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-destructive">Comentarios de rechazo</label>
        <textarea
          value={String(row.comentario ?? '')}
          onChange={e => collection.update(id, { comentario: e.target.value })}
          placeholder="Motivo del rechazo…"
          rows={2}
          className="w-full resize-y rounded-md border border-destructive/40 bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40"
        />
      </div>
    )
  },
}
