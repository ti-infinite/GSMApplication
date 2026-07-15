// Flujo de recepción (mock IndexedDB + localStorage) — refleja el modelo real:
//  · Estado = por TRX (orden, recepción y factura son TRX con su propio estado).
//  · Aceptado/Rechazado/qty = DATOS del producto dentro de la recepción.
//  · "Pendiente" = DERIVADO: orden − Σ recibido (verificado) en recepciones previas.
//  · Inventario = se carga en CADA recepción confirmada (no al final).
//  · Orden: GENERADA → EN_RECEPCION → RECIBIDA (cuando pending = 0).
import { getOrden, saveOrden, listOrdenes, listRecepciones, saveRecepcion } from '@/shared/lib/idb'

type Line = Record<string, unknown>

interface OrdenData {
  numero?: string; estado?: string; proveedor?: string
  lines?: Array<{ id: string; varietyName: string; qty: number }>
  [k: string]: unknown
}
interface StoredReception { factura: string; lines: Array<{ id: string; recibida: number; estado: string }> }
type DraftMap = Record<string, { estado?: string; recibida?: number; comentario?: string }>

const DRAFT_KEY = (f: string) => `rec_draft_${f}`
const INV_KEY   = 'gsm_inventory_movements'

// Σ recibido (verificado) por producto, sobre las recepciones confirmadas de la factura.
async function receivedByProduct(factura: string): Promise<Record<string, number>> {
  const receps = (await listRecepciones<StoredReception>()).filter(r => r.factura === factura)
  const recibido: Record<string, number> = {}
  for (const r of receps) for (const l of r.lines) {
    if (l.estado === 'verificado') recibido[l.id] = (recibido[l.id] ?? 0) + Number(l.recibida || 0)
  }
  return recibido
}

// ── Borrador (WIP de "Guardar recepción") — localStorage por factura ──
function getDraft(factura: string): DraftMap {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY(factura)) ?? '{}') as DraftMap } catch { return {} }
}
export function saveDraft(factura: string, lines: Line[]): void {
  if (!factura) return
  const map: DraftMap = {}
  for (const l of lines) map[String(l.id ?? '')] = { estado: String(l.estado ?? ''), recibida: Number(l.recibida || 0), comentario: String(l.comentario ?? '') }
  localStorage.setItem(DRAFT_KEY(factura), JSON.stringify(map))
}
function clearDraft(factura: string): void { localStorage.removeItem(DRAFT_KEY(factura)) }

// Mock inventario: registra una ENTRADA por cada línea verificada.
function postInventory(factura: string, lines: Line[]): void {
  const moves = lines
    .filter(l => String(l.estado) === 'verificado')
    .map(l => ({ factura, id: String(l.id ?? ''), varietyName: String(l.varietyName ?? ''), qty: Number(l.recibida || 0), at: Date.now() }))
  if (moves.length === 0) return
  let log: unknown[] = []
  try { log = JSON.parse(localStorage.getItem(INV_KEY) ?? '[]') } catch { log = [] }
  localStorage.setItem(INV_KEY, JSON.stringify([...log, ...moves]))
}

// Líneas PENDIENTES por recibir (orden − ya recibido). Superpone el borrador guardado.
// Las totalmente recibidas desaparecen; la cantidad se pre-carga con lo que falta.
export async function getPendingLines(factura: string): Promise<Line[]> {
  if (!factura) return []
  const orden    = await getOrden<OrdenData>(factura)
  const recibido = await receivedByProduct(factura)
  const draft    = getDraft(factura)
  return (orden?.lines ?? []).flatMap(l => {
    const pendiente = Number(l.qty) - (recibido[l.id] ?? 0)
    if (pendiente <= 0) return []   // recibido completo → fuera
    const d = draft[l.id]
    return [{
      id: l.id, varietyName: l.varietyName, enviada: l.qty,
      recibida:   d?.recibida ?? pendiente,
      estado:     d?.estado || 'pendiente',
      comentario: d?.comentario ?? '',
    }]
  })
}

// "Guardar recepción" → persiste el borrador (sin tocar inventario ni cerrar TRX).
export function guardarBorrador(factura: string, lines: Line[]): void {
  saveDraft(factura, lines)
}

// "Confirmar recepción" → crea la recepción (TRX) con lo resuelto, carga inventario,
// consume el borrador y mueve el estado de la orden (EN_RECEPCION / RECIBIDA).
export async function saveReceptionTrx(factura: string, lines: Line[]): Promise<{ recibidos: number; rechazados: number; ordenCerrada: boolean; consecutivo: string }> {
  const resolved = lines.filter(l => String(l.estado ?? '') !== 'pendiente')
  // Consecutivo de la recepción: la OC pasa a RC (OC-0001 → RC-0001).
  const consecutivo = factura.replace(/^OC/i, 'RC') || `RC-${Date.now().toString(36).toUpperCase()}`
  const numero = `REC-${factura || 'X'}-${Date.now()}`
  await saveRecepcion(numero, {
    numero, factura, consecutivo,
    lines: resolved.map(l => ({
      id: String(l.id ?? ''), varietyName: String(l.varietyName ?? ''),
      recibida: Number(l.recibida || 0), estado: String(l.estado ?? ''), comentario: String(l.comentario ?? ''),
    })),
    createdAt: Date.now(),
  })
  postInventory(factura, resolved)
  clearDraft(factura)

  // Estado de la orden: RECIBIDA si ya no queda pendiente, si no EN_RECEPCION.
  const orden = await getOrden<OrdenData>(factura)
  let ordenCerrada = false
  if (orden) {
    const recibido = await receivedByProduct(factura)   // incluye la recepción recién guardada
    const pendienteTotal = (orden.lines ?? []).reduce((s, l) => s + Math.max(0, Number(l.qty) - (recibido[l.id] ?? 0)), 0)
    ordenCerrada = pendienteTotal <= 0
    await saveOrden(factura, { ...orden, estado: ordenCerrada ? 'RECIBIDA' : 'EN_RECEPCION' })
  }
  return {
    recibidos:  resolved.filter(l => String(l.estado) === 'verificado').length,
    rechazados: resolved.filter(l => String(l.estado) === 'rechazado').length,
    ordenCerrada,
    consecutivo,
  }
}

// Guard: confirmar requiere ≥1 ítem resuelto y que todo rechazo lleve comentario.
export function recepcionValida(collection: Line[]): boolean {
  const resolved = collection.filter(r => String(r.estado ?? '') !== 'pendiente')
  if (resolved.length === 0) return false
  return !resolved.some(r => String(r.estado) === 'rechazado' && !String(r.comentario ?? '').trim())
}

// Órdenes ABIERTAS (para el combo de recepción): las que NO están RECIBIDA.
export async function getOpenOrdenes(): Promise<Array<{ numero: string; estado: string }>> {
  const list = await listOrdenes<{ numero: string; estado?: string }>()
  return list
    .filter(o => (o.estado ?? 'GENERADA') !== 'RECIBIDA')
    .map(o => ({ numero: o.numero, estado: o.estado ?? 'GENERADA' }))
}
