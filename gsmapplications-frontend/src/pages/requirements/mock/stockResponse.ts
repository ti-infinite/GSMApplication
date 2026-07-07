// Forma de una fila de stock que consume la tabla. Variedad/SKU REALES
// (masterProducts); consumo/restante simulados pero estables por sku.
export interface StockRow {
  id:          string   // único por variedad (sku + idVariety)
  idVariety:   number
  sku:         string
  varietyName: string
  consumption: number
  remaining:   number
}
