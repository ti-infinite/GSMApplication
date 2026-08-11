import { useState, useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { Plus, Trash2, XCircle, Copy, ChevronDown, Check } from 'lucide-react'
import type { CellRenderCtx, TrxField } from '../model/runtime'
import { unitOptionsFor, toBaseUnit, fromBaseUnit } from '../model/units'
import { formatMoney } from '../model/money'

// ¿La qty deja el stock negativo? Se activa con `sign`/`negate` (ya dicen "esto resta stock",
// no hace falta un tag `max` aparte) comparado siempre contra `remaining` de la MISMA fila —
// convención fija, igual en todo módulo que lo usa. Marca el input en rojo → señala JUSTO el
// dato incorrecto. Exportada: la usa también `addButton` de acá abajo y el evento STOCK_LIMIT
// (registry/events.ts, cuando el módulo lo declara en `event`) — un solo cálculo, un lugar.
export function overMax(field: TrxField, row: Record<string, unknown>): boolean {
  if (!field.sign && !field.negate) return false
  const remaining = Number(row.remaining)
  const val = Number(row[field.selectorValue ?? ''])
  return Number.isFinite(remaining) && Number.isFinite(val) && remaining + val < 0
}
const errBorder = (over: boolean, focusWithin = false) =>
  over
    ? `border-destructive ${focusWithin ? 'focus-within:ring-destructive' : 'focus:ring-destructive'}`
    : `border-border ${focusWithin ? 'focus-within:ring-ring' : 'focus:ring-ring'}`

// Input numérico + selector de unidad. El valor de la fila se guarda SIEMPRE en la base
// (kg/L) → el payload sale en la unidad estándar sin que el usuario vea la conversión.
// La unidad elegida es estado LOCAL (preferencia de captura, no se persiste). Al cambiarla,
// la cifra tecleada se reinterpreta en la nueva unidad (mismo número, distinta unidad).
function InputUnitSelect({ value, row, field, setValue }: CellRenderCtx): ReactNode {
  // `unitType:"unitSelect"` gana en normField antes de mirar `sign` (son ramas del mismo
  // else-if) — este renderer nunca heredaba el "permite negativos" que sí tienen
  // `inputUnit`/`signedInput`. Por eso el ajuste con unidad no dejaba tipear "-" y el mismo
  // campo, sin unitType (ej. en el summary), sí.
  const allowNeg = field.sign === true
  const measurementUnit = String(row[field.sub ?? 'measurementUnit'] ?? '')
  const opts = unitOptionsFor(measurementUnit)
  const round3 = (n: number) => Math.round(n * 1000) / 1000                 // máx 3 decimales (1 g = 0.001 kg)
  // el select usa claves en minúscula (kg/l); normalizo la unidad de la fila (KG/L) para que matchee.
  const [unit, setUnit] = useState(measurementUnit.trim().toLowerCase())
  const [text, setText] = useState(
    value == null || value === '' || Number.isNaN(Number(value))
      ? '' : String(round3(fromBaseUnit(Number(value), measurementUnit))),
  )
  // Resincroniza si `value` cambia desde AFUERA de este input (ej. la misma fila editada
  // desde el carrito/summary) — sin esto, `text` queda pegado al valor del montaje para
  // siempre. No pisa mientras el usuario está tecleando acá (`focused`).
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (focused) return
    setText(value == null || value === '' || Number.isNaN(Number(value)) ? '' : String(round3(fromBaseUnit(Number(value), unit))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])
  // Convierte a base y setea; captura el throw de toBaseUnit (unidad desconocida) → toast.
  const commit = (n: number, u: string) => {
    try { setValue(round3(toBaseUnit(n, u))) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unidad inválida') }
  }
  const onText = (raw: string) => {
    let clean = raw.replace(allowNeg ? /[^0-9.-]/g : /[^0-9.]/g, '')
    if (allowNeg) { const neg = clean.startsWith('-'); clean = (neg ? '-' : '') + clean.replace(/-/g, '') }
    const dot = clean.indexOf('.')                                          // 1 solo punto, máx 3 decimales
    if (dot !== -1) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '').slice(0, 3)
    setText(clean)
    if (clean === '' || clean === '-') setValue(''); else commit(Number(clean), unit)
  }
  const onUnit = (u: string) => {
    setUnit(u)
    if (text !== '') commit(Number(text), u)
  }
  const over = overMax(field, row)   // qty deja el stock negativo → borde rojo
  // Un solo control: input + dropdown de unidad EMBEBIDO (un borde, [ 90 │ kg ▾ ]).
  return (
    <div className={`inline-flex w-fit items-center rounded-md border bg-background focus-within:ring-2 ${errBorder(over, true)}`}>
      <input
        type="text" inputMode="decimal" value={text}
        onChange={e => onText(e.target.value)}
        // select(): al hacer click en un campo que ya tiene "0" (valor real, no placeholder),
        // el cursor solo se posicionaba ahí — tipear insertaba junto al 0 ("090") en vez de
        // reemplazarlo. Seleccionar todo al entrar hace que tipear lo reemplace de una.
        onFocus={e => { setFocused(true); e.target.select() }} onBlur={() => setFocused(false)}
        placeholder="0"
        className="w-16 min-w-0 rounded-l-md bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {opts.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-0.5 self-stretch rounded-r-md border-l border-border px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {opts.find(o => o.value === unit)?.label ?? unit}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-16">
            {opts.map(o => (
              <DropdownMenuItem key={o.value} onSelect={() => onUnit(o.value)} className="gap-2">
                <Check className={`h-3.5 w-3.5 ${o.value === unit ? 'text-primary opacity-100' : 'opacity-0'}`} />
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        measurementUnit && <span className="self-stretch border-l border-border px-2 py-1 text-sm text-muted-foreground">{measurementUnit}</span>
      )}
    </div>
  )
}

// Input de MONEDA: guarda el número PLANO en la fila (lo que viaja al payload); el símbolo
// y separadores son solo display (moneda del tenant vía formatMoney). Muestra formateado
// cuando NO está enfocado y el número crudo al editar. Con `field.sign` permite negativos.
function MoneyInput({ value, field, setValue }: CellRenderCtx): ReactNode {
  const allowNeg = field.sign === true
  const [focused, setFocused] = useState(false)
  // 0 se trata como vacío TAMBIÉN acá (no solo en `display` sin foco) — si no, al hacer click
  // aparecía un "0" real que había que seleccionar/borrar antes de tipear (fácil de pasar por
  // alto y terminar escribiendo "098784"). Así el campo arranca en blanco directo.
  const isZero = (v: unknown) => v != null && v !== '' && Number(v) === 0
  const [text, setText] = useState(value == null || value === '' || isZero(value) ? '' : String(value))

  useEffect(() => {
    if (!focused) setText(value == null || value === '' || isZero(value) ? '' : String(value))
  }, [value, focused])

  const onChange = (raw: string) => {
    let clean = raw.replace(allowNeg ? /[^0-9.-]/g : /[^0-9.]/g, '')
    if (allowNeg) { const neg = clean.startsWith('-'); clean = (neg ? '-' : '') + clean.replace(/-/g, '') }
    const dot = clean.indexOf('.'); if (dot !== -1) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '')
    setText(clean)
    setValue(clean === '' || clean === '-' ? '' : Number(clean))
  }

  // 0 se trata como "vacío" acá SOLO para mostrar (deja ver el placeholder gris en vez de "$0"
  // en negro, que parece un valor real ya cargado) — el 0 real que guarda la fila no cambia,
  // sigue viajando igual al payload si el usuario nunca lo toca.
  const display = focused
    ? text
    : (value == null || value === '' || Number.isNaN(Number(value)) || Number(value) === 0 ? '' : formatMoney(Number(value)))

  return (
    <input
      type="text" inputMode="decimal" value={display}
      onFocus={e => { setFocused(true); e.target.select() }} onBlur={() => setFocused(false)}
      onChange={e => onChange(e.target.value)} placeholder={formatMoney(0)}
      className="w-28 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  )
}

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

  // Texto de SOLO lectura (explícito). Igual al default cuando no hay renderer,
  // pero declarable con `type: "text"` para dejar claro que la celda no se edita.
  text: ({ value }) => (value == null || value === '' ? '—' : String(value)),

  // Input numérico editable (edición inline).
  input: ({ value, row, field, setValue }) => (
    <input
      type="number" min="0" inputMode="numeric"
      value={value == null || value === '' ? '' : String(value)}
      onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
      onFocus={e => e.target.select()}
      placeholder="0"
      className={`w-24 min-w-0 rounded-md border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${errBorder(overMax(field, row))}`}
    />
  ),

  // Input numérico editable + su unidad al lado (opt-in: `type:"input"` + `unit:true`/`unitType:"unit"`).
  // La unidad sale de `field.sub` (default 'measurementUnit'). Con `sign:true` permite +/- (ajuste con
  // unidad) — usa `type="text"` porque el number input descarta el "-".
  inputUnit: ({ value, row, field, setValue }) => {
    const unit = field.sub ? String(row[field.sub] ?? '') : ''
    const signed = field.sign === true
    return (
      <div className="flex items-center gap-1.5">
        <input
          type={signed ? 'text' : 'number'} inputMode="decimal" min={signed ? undefined : '0'}
          value={value == null || value === '' ? '' : String(value)}
          onChange={e => { let v = e.target.value.replace(signed ? /[^0-9.-]/g : /[^0-9.]/g, ''); if (signed && v.lastIndexOf('-') > 0) v = v.replace(/-/g, ''); setValue(v) }}
          onFocus={e => e.target.select()}
          placeholder={signed ? '±0' : '0'}
          className={`w-20 min-w-0 rounded-md border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${errBorder(overMax(field, row))}`}
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    )
  },

  // Input + selector de unidad (guarda en base kg/L). Opt-in: `type:"input"` + `unitType:"unitSelect"`.
  inputUnitSelect: ctx => <InputUnitSelect {...ctx} />,

  // Moneda solo lectura ($ del tenant). Opt-in: `type:"money"`. Guarda/lee el número plano.
  money: ({ value }) => (value == null || value === '' || Number.isNaN(Number(value)) ? '—' : formatMoney(Number(value))),

  // Input de moneda editable. Opt-in: `type:"input"` + `money:true` (+ `sign:true` para negativos).
  moneyInput: ctx => <MoneyInput {...ctx} />,

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

  // Checkbox editable (booleano) — ej. marcar "orgánico", "urgente".
  checkbox: ({ value, setValue }) => (
    <input
      type="checkbox"
      checked={value === true || value === 'true' || value === 1 || value === '1'}
      onChange={e => setValue(e.target.checked)}
      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
    />
  ),

  // Select editable con opciones INLINE (field.values) — combo quemado en el JSON.
  select: ({ value, setValue, field }) => (
    <select
      value={value == null ? '' : String(value)}
      onChange={e => setValue(e.target.value)}
      className="min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">—</option>
      {(field.values ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),

  // Input numérico + botón [＋] al lado → agrega la fila (con su cantidad) a la collection.
  inputAdd: ({ value, row, setValue, collection, keyField }) => (
    <div className="flex items-center gap-1.5">
      <input
        type="number" min="0" inputMode="decimal"
        value={value == null || value === '' ? '' : String(value)}
        onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={e => e.target.select()}
        placeholder="0"
        className="w-20 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button size="icon" onClick={() => collection.add(row)} disabled={collection.has(String(row[keyField]))} className="h-8 w-8 shrink-0" aria-label="Agregar">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),

  // Input de texto que permite valores NEGATIVOS (ej. ajuste +/− de inventario).
  // `type="text"` a propósito: los number inputs descartan el "-" al tipearlo.
  signedInput: ({ value, row, field, setValue }) => (
    <input
      type="text" inputMode="decimal"
      value={value == null || value === '' ? '' : String(value)}
      onChange={e => { let v = e.target.value.replace(/[^0-9.-]/g, ''); if (v.lastIndexOf('-') > 0) v = v.replace(/-/g, ''); setValue(v) }}
      onFocus={e => e.target.select()}
      placeholder="±0"
      className={`w-24 min-w-0 rounded-md border bg-background px-2 py-1 text-right text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${errBorder(overMax(field, row))}`}
    />
  ),

  // Como signedInput pero con botón [＋] para agregar la fila a la collection.
  signedInputAdd: ({ value, row, setValue, collection, keyField }) => (
    <div className="flex items-center gap-1.5">
      <input
        type="text" inputMode="decimal"
        value={value == null || value === '' ? '' : String(value)}
        onChange={e => { let v = e.target.value.replace(/[^0-9.-]/g, ''); if (v.lastIndexOf('-') > 0) v = v.replace(/-/g, ''); setValue(v) }}
        onFocus={e => e.target.select()}
        placeholder="±0"
        className="w-24 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-right text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button size="icon" onClick={() => collection.add(row)} disabled={value == null || value === '' || Number(value) === 0 || collection.has(String(row[keyField]))} className="h-8 w-8 shrink-0" aria-label="Registrar">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),

  // Row-action: agrega la fila a la collection (carrito). Deshabilitado si la cantidad
  // (`qty`, el campo estándar) está vacía o en 0. Permite NEGATIVOS (ajustes -/+); quién
  // controla si se pueden tipear negativos es el input (`sign: true` sí, si no, no).
  addButton: ({ row, field, collection, keyField, t }) => {
    // `field.selectorValue` (no `row.qty` fijo): esta columna puede editar cualquier campo,
    // no siempre se llama "qty" — antes quedaba mudo si algún día no lo era.
    const qtyKey = field.selectorValue ?? 'qty'
    const qty = Number(row[qtyKey])
    const emptyQty = row[qtyKey] == null || row[qtyKey] === '' || Number.isNaN(qty) || qty === 0
    // Tope: si el campo tiene `sign`/`negate` (resta stock), la qty aplicada a `remaining` de la
    // misma fila no puede dejarlo negativo. Sirve para gasto (siempre resta) y ajuste (solo el
    // lado negativo topa; sumar es libre). Deshabilita agregar + avisa. Mismo cálculo que el
    // borde rojo del input y que el evento STOCK_LIMIT (registry/events.ts) — `overMax` de arriba.
    const remaining = Number(row.remaining)
    const over = !emptyQty && overMax(field, row)
    // Sin crecer la fila: el + se pone ROJO (destructive) + Tooltip (nuestro, con el theme del tenant)
    // con el motivo (hover), en vez de texto abajo. El span envuelve el botón deshabilitado para
    // que capture el hover (un `disabled` no dispara eventos por sí solo).
    const overMsg = over ? (t?.('overMax', { max: remaining }) ?? `Supera el disponible (${remaining})`) : undefined
    const addBtn = (
      <Button
        size="icon"
        variant={over ? 'destructive' : 'default'}
        onClick={() => collection.add(row)}
        disabled={emptyQty || over || collection.has(String(row[keyField]))}
        aria-label={overMsg ?? 'Agregar'}
      >
        <Plus className="h-4 w-4" />
      </Button>
    )
    // La basurita para quitar una fila `_added` YA NO va acá — es una columna automática
    // del motor (`defaultComponents.tsx`'s `TrxTable`, `removeExtraCol`), misma condición
    // que activa el picker de "cargar insumo" (CATALOG en el registry). Una sola fuente.
    return over ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span className="cursor-not-allowed">{addBtn}</span></TooltipTrigger>
          <TooltipContent>{overMsg}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : addBtn
  },

  // Row-action: quita la fila de la collection.
  removeButton: ({ row, collection, keyField }) => (
    <Button
      variant="ghost" size="icon"
      onClick={() => collection.remove(String(row[keyField]))}
      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label="Quitar"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  ),

  // Cantidad recibida: BLOQUEADA en `originalQty` (aceptación implícita) hasta que la fila
  // se marque `rejected` (botón `rejectButton`) — ahí se habilita editar. Excepción: una fila
  // AGREGADA a mano (`_added`, "cargar insumo") no tiene `originalQty` que aceptar — nada que
  // rechazar, se edita directo (ver también `rejectButton`, que ni se muestra en esas filas).
  // `setValue` rutea solo (edits en tabla principal, collection si algún día vive en un
  // carrito) — NO usar `collection.update` acá, esa tabla no es un carrito.
  receivedQtyInput: ({ value, row, field, setValue }) => {
    // `renderer` explícito en el JSON → normField corta antes de derivar `sub` desde `unitType`
    // (eso es solo para el shorthand genérico) — por eso acá el default es manual, igual que
    // `inputUnit`/`withUnit`. Con `"sub"` propio en el JSON, ese gana.
    const unit = String(row[field.sub ?? 'measurementUnit'] ?? '')
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number" min="0" inputMode="numeric"
          disabled={!row.rejected && !row._added}
          value={value == null || value === '' ? '' : String(value)}
          onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
          onFocus={e => e.target.select()}
          placeholder="0"
          className={`w-24 min-w-0 rounded-md border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${errBorder(overMax(field, row))}`}
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    )
  },

  // Toggle "Rechazar" — marca `rejected` y desbloquea `qty` para editar. Columna con
  // `selectorValue:"rejected"` → `setValue` ya rutea correcto (edits o collection según
  // dónde viva la fila). NO resetea `qty` al deshacer (no hay para dónde: `setValue` es
  // de UN campo) — si el usuario deshace el rechazo, el número que dejó tecleado se queda.
  // Nombre con "Button" a propósito: la card mobile (defaultComponents.tsx) agrupa los
  // campos por nombre de renderer (/button/i · /input/i) — sin eso cae en la grilla de
  // "datos" en vez de la fila de acciones.
  rejectButton: ({ row, setValue, t }) => {
    // Fila AGREGADA a mano → nada que rechazar (no vino en el documento origen, no hay
    // expectativa que incumplir). El botón no se muestra; `receivedQtyInput` ya la deja
    // editable directo para esas filas.
    if (row._added) return null
    const rejected = !!row.rejected
    return (
      <Button
        variant={rejected ? 'destructive' : 'outline'} size="sm"
        onClick={() => setValue(!rejected)}
        className="gap-1.5 whitespace-nowrap"
      >
        <XCircle className="h-3.5 w-3.5" /> {t?.(rejected ? 'undoReject' : 'reject') ?? (rejected ? 'Undo reject' : 'Reject')}
      </Button>
    )
  },

  // Duplica la fila con un id NUEVO (dividir presentación / partir una línea).
  // La copia queda marcada `added` → se puede quitar; la original no.
  splitButton: ({ row, collection, keyField }) => (
    <Button
      variant="ghost" size="icon"
      onClick={() => collection.add({ ...row, [keyField]: `${String(row[keyField] ?? '')}#${Date.now().toString(36)}`, added: true })}
      className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
      aria-label="Dividir" title="Dividir línea"
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  ),

  // Como `splitButton`, pero para tablas SIN carrito (`summary:false` — ej. Invoice): duplica
  // la fila en la tabla PRINCIPAL vía `addProductRow` (mismo canal que "cargar insumo"), no
  // `collection.add` (que ahí escribe a un carrito que nadie lee). Queda `_added:true` → editable
  // y con su botón de quitar automático (misma columna sintética que "cargar insumo").
  splitRow: ({ row, keyField, addProductRow }) => {
    if (!addProductRow) return null
    return (
      <Button
        variant="ghost" size="icon"
        onClick={() => addProductRow({ ...row, [keyField]: `${String(row[keyField] ?? '')}#${Date.now().toString(36)}` })}
        className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        aria-label="Dividir" title="Dividir línea"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    )
  },

  // Quita la fila SOLO si fue agregada/dividida (`added`). Las originales no se borran.
  removeAdded: ({ row, collection, keyField }) => {
    if (!row.added) return null
    return (
      <Button
        variant="ghost" size="icon"
        onClick={() => collection.remove(String(row[keyField]))}
        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Quitar" title="Quitar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    )
  },

  // Comentario de rechazo: solo aparece si `rejected`. Columna con `selectorValue:"comment"`
  // → `setValue` ya rutea correcto, sin pasar por `collection` (esta tabla no es un carrito).
  // UNA línea (no textarea) — misma altura que el resto de las celdas, no infla la fila.
  // Nombre con "Input" a propósito (ver nota en rejectButton) — así queda agrupado con
  // `receivedQtyInput` en la card mobile, no suelto en la grilla de "datos".
  rejectCommentInput: ({ row, setValue, t }) => {
    if (!row.rejected) return null
    return (
      <input
        type="text"
        value={String(row.comment ?? '')}
        onChange={e => setValue(e.target.value)}
        placeholder={t?.('rejectReasonPlaceholder') ?? 'Reason…'}
        className="w-full min-w-0 rounded-md border border-destructive/40 bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40"
      />
    )
  },
}
