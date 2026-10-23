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
    // Manual override -- used instead of the relay's live NHUBEX derivation
    // when provided. Never validated against NHUBEX; the caller is
    // responsible for correctness.
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
