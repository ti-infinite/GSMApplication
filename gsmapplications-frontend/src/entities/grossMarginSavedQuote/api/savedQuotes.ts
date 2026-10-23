import { makeResourceClient } from "@/shared/lib/grossMarginResourceClient";
import type { SavedQuoteCreateBody, SavedQuoteRow } from "../model/types";

export const savedQuotesApi = makeResourceClient<SavedQuoteRow, SavedQuoteCreateBody, never>("/saved-quotes");
