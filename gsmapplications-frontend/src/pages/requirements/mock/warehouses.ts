// MOCK — simula el endpoint de warehouses/fincas (aún no existe en el backend).
// La location activa se resuelve contra esta lista (cookie-match) o se elige del combo.
export interface Warehouse {
  location: string   // código = value del combo
  name:     string   // etiqueta a mostrar
}

export const MOCK_WAREHOUSES: Warehouse[] = [
  { location: 'BOS', name: 'BOS' },
  { location: 'CHI', name: 'CHI' },
  { location: 'MIA', name: 'MIA' },
  { location: 'VIN', name: 'VIN' },
  { location: 'PAC', name: 'PAC' },
  { location: 'FUN', name: 'FUN' },
  { location: 'ESP', name: 'ESP' },
  { location: 'SOP', name: 'SOP' },
]
