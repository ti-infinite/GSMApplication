import { makeResourceClient } from "@/shared/lib/grossMarginResourceClient";
import type { TransportCostRow } from "../model/types";

export const transportCostApi = makeResourceClient<
  TransportCostRow,
  // Type/Packaging/Qty are NOT NULL in db_ai.DivisionTransportCost -- every
  // real row has all three (unlike BoxesXPallet/PalletCost, which have
  // genuine blank cases in the source data), so they're required here too.
  {
    divisionName: string;
    type: string;
    packaging: string;
    measurementUnitValue: number;
    qty: number;
    boxesXPallet?: number;
    palletCost?: number;
    // Identity field, set once on create -- omit for "applies regardless
    // of warehouse" (every division's behavior before Market Basket).
    warehouse?: string;
    // Identity field, set once on create -- omit for "applies regardless
    // of pack count" (needed when the same size ships in more than one
    // physical pack format, e.g. Military Produce Group's 3pk vs 6pk).
    packQty?: number;
  },
  { qty: number; boxesXPallet?: number; palletCost?: number }
>("/transport-cost");
