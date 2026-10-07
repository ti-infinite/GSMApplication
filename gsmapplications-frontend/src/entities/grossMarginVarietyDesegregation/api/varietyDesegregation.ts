import { makeResourceClient } from "@/shared/lib/grossMarginResourceClient";
import type { VarietyDesegregationRow } from "../model/types";

export const varietyDesegregationApi = makeResourceClient<
  VarietyDesegregationRow,
  // factor: omit for a normal count-based row (server defaults to 1) --
  // only set for a percentage-based blend like Poultry (e.g. 1/3).
  { parentVariety: string; childVariety: string; quantity: number; factor?: number },
  { quantity: number; factor?: number }
>("/varietyDesegregation");
