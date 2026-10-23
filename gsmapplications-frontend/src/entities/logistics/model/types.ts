// One row of db_srv.IHLogistics, as returned by ih-agent (column names kept 1:1).
export interface LogisticsRow {
  ID:               number
  WHS:              string | null
  Division:         string | null
  Invoice:          string
  DateShip:         string | null   // yyyy-MM-dd
  Pallets:          number | null
  CarrierA:         string | null
  CarrierB:         string | null
  ConfirmedCarrier: string | null
}

export interface LogisticsFilters {
  whs?:      string
  division?: string
  dateFrom?: string   // yyyy-MM-dd
  dateTo?:   string   // yyyy-MM-dd
}

export interface LogisticsFilterOptions {
  whs:       string[]
  divisions: string[]
}

// Only the editable columns travel back; ConfirmedCarrier must be CarrierA, CarrierB or null.
export type CarrierChange = Pick<LogisticsRow, 'ID' | 'CarrierA' | 'CarrierB' | 'ConfirmedCarrier'>
