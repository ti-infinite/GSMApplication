import { makeResourceClient } from "@/shared/lib/grossMarginResourceClient";
import type { CostReferenceRow } from "../model/types";

export const costReferenceApi = makeResourceClient<
  CostReferenceRow,
  {
    variety: string;
    warehouse: string;
    packing?: number;
    sticker?: number;
    box?: number;
    labourProd?: number;
    labourRepack?: number;
    labourAssembler?: number;
    // Manual override -- used directly instead of the relay's live
    // NHUBEX-derive attempt when provided. Never validated against NHUBEX;
    // the caller (the Quote Simulator's SKU builder) is responsible for it
    // being correct. Added 2026-09-17, see README.md §12.
    calculatedSku?: string;
  },
  {
    packing?: number;
    sticker?: number;
    box?: number;
    labourProd?: number;
    labourRepack?: number;
    labourAssembler?: number;
  }
>("/cost-reference");
