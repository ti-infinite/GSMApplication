// Mirrors db_srv.IHLogistics as served by ih-logistics: one row per outbound invoice.
export interface LogisticsRow {
  ID: number;
  WHS: string | null;
  Division: string | null; // customer / distribution centre
  Invoice: string;
  DateShip: string | null; // YYYY-MM-DD
  Pallets: number | null;
  CarrierA: string | null;
  CarrierB: string | null;
  ConfirmedCarrier: string | null; // the chosen carrier's name (equals CarrierA or CarrierB)
  PO: string | null;
}

/** One IHSales line of an invoice: what is being shipped and how much. */
export interface LogisticsLine {
  Row: number;
  PO: string | null;
  Code: string | null;
  Description: string | null;
  Qty: number | null;
  Price: number | null;
  Amount: number | null;
  DateShip: string | null;
  DeliveryDate: string | null;
  Name: string | null;
  Location: string | null;
}

export type CarrierSlot = "A" | "B";

/** One save from the inline row editor. Carriers are always written; Pallets
 *  and Confirmed are only applied by the service when present. */
export interface LogisticsUpdateBody {
  CarrierA: string | null;
  CarrierB: string | null;
  Pallets?: number | null;
  Confirmed?: CarrierSlot | null;
}

/** One option of the WHS filter: a GSM location. */
export interface LocationOption {
  code: string;
  name: string;
}
