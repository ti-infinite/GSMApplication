// Dominio de pedido → orden → recepción — compartido a lo largo del flujo
// Requirements → Purchase Orders → Recepción. Tenant-agnóstico.

export interface PedidoLine {
  id:          string   // único por variedad (sku + idVariety)
  varietyName: string
  qty:         number
}

// Requirements: el pedido que se confirma.
export interface Pedido {
  consecutivo: string   // PED-0001…
  location:    string
  lines:       PedidoLine[]
  createdAt:   number
}

// Purchase Orders: la orden de compra generada. qty de cada línea = cantidad solicitada.
export interface Orden {
  numero:    string     // OC-0001…
  proveedor: string
  origen:    string     // consecutivo del pedido de origen (PED-0001…)
  lines:     PedidoLine[]
  createdAt: number
}

// Recepción: una línea con lo solicitado vs lo recibido.
export interface RecepcionLine {
  id:          string
  varietyName: string
  solicitada:  number
  recibida:    number
}

export interface Recepcion {
  numero:    string     // = número de la orden recibida (OC-0001…)
  lines:     RecepcionLine[]
  createdAt: number
}

// Facturas: la factura del proveedor sobre lo recibido. Nombre/cantidad editables.
export interface FacturaLine {
  id:     string
  nombre: string
  qty:    number
}

export interface Factura {
  numero:    string     // FAC-0001…
  origen:    string     // número de la recepción/orden facturada (OC-0001…)
  lines:     FacturaLine[]
  createdAt: number
}
