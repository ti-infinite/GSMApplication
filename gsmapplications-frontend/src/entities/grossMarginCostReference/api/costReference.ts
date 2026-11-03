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
    extraCosts?: number;
    calculatedSku?: string;
  },
  {
    packing?: number;
    sticker?: number;
    box?: number;
    labourProd?: number;
    labourRepack?: number;
    labourAssembler?: number;
    extraCosts?: number;
  }
>("/cost-reference");
