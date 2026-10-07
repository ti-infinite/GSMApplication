import { makeResourceClient } from "@/shared/lib/grossMarginResourceClient";
import type { ExtraCostRow } from "../model/types";

export const extraCostApi = makeResourceClient<
  ExtraCostRow,
  { supplier: string; skuCalculated: string; measureUnit: number; mia?: number; bos?: number; chi?: number; vin?: number },
  { mia?: number; bos?: number; chi?: number; vin?: number }
>("/extraCost");
