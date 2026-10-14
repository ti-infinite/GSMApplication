import { useMemo, useState } from "react";
import { buildKnownHerbCodes, SKU_CLASSES, SKU_TYPES } from "./skuVocabulary";
import type { SalesRow } from "@/entities/grossMarginSalesRow";

export const SKU_NOT_LISTED = "__not_listed__";
const HERB_CODE_PATTERN = /^[A-Z]{4}$/;

// Collapsed-by-default SKU builder for the "save as Cost Reference" banner
// -- a fallback for when the relay's live NHUBEX lookup doesn't have the
// product's code yet. Paired view: quote-simulator-sku-builder.tsx.
export function useSkuBuilder(rows: SalesRow[]) {
  const [isSkuExpanded, setIsSkuExpanded] = useState(false);
  const [skuClass, setSkuClass] = useState(SKU_CLASSES[0].code);
  const [skuType, setSkuType] = useState(SKU_TYPES[0].code);
  const [herbSearch, setHerbSearch] = useState("");
  const [selectedHerbCode, setSelectedHerbCode] = useState("");
  const [customHerbCode, setCustomHerbCode] = useState("");

  const knownHerbCodes = useMemo(() => buildKnownHerbCodes(rows), [rows]);
  const filteredHerbCodes = useMemo(
    () => knownHerbCodes.filter((h) => h.label.toLowerCase().includes(herbSearch.toLowerCase())),
    [knownHerbCodes, herbSearch]
  );

  const usingCustomHerb = selectedHerbCode === SKU_NOT_LISTED;
  const herbCode = usingCustomHerb ? customHerbCode.trim().toUpperCase() : selectedHerbCode;
  const herbCodeValid = HERB_CODE_PATTERN.test(herbCode);
  const builtSku = herbCodeValid ? `${skuClass}${skuType}${herbCode}` : null;

  return {
    isSkuExpanded,
    setIsSkuExpanded,
    skuClass,
    setSkuClass,
    skuType,
    setSkuType,
    herbSearch,
    setHerbSearch,
    selectedHerbCode,
    setSelectedHerbCode,
    customHerbCode,
    setCustomHerbCode,
    filteredHerbCodes,
    usingCustomHerb,
    herbCodeValid,
    builtSku,
  };
}
