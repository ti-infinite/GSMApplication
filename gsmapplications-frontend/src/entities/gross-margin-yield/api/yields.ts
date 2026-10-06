import { makeResourceClient } from "@/shared/lib/grossMarginResourceClient";
import type { YieldRow } from "../model/types";

export const yieldsApi = makeResourceClient<
  YieldRow,
  { variety: string; yieldValue: number },
  { yieldValue: number }
>("/yields");
