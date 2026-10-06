import { useMemo, useState } from "react";

// The repeated "search text + unique sorted values + filtered results"
// triplet duplicated across every reference card's variety/customer/SKU
// picker (7 instances across 6 cards -- variety-desegregation-card.tsx uses
// this twice, for its parent AND child pickers). `extractor` is a plain
// field-accessor (e.g. `r => r.Variety`), not stateful -- deliberately left
// out of the memo deps, matching every original inline useMemo's own
// [rows]-only deps, so callers don't need to useCallback-wrap it.
// REFACTOR_PLAN.md phase 02.
export function useReferenceSearch<T>(items: T[], extractor: (item: T) => string) {
  const [search, setSearch] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- extractor is a stable field accessor
  const values = useMemo(() => Array.from(new Set(items.map(extractor))).sort(), [items]);
  const filtered = useMemo(
    () => values.filter((v) => v.toLowerCase().includes(search.toLowerCase())),
    [values, search]
  );
  return { search, setSearch, values, filtered };
}
