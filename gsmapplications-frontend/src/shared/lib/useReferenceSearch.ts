import { useMemo, useState } from "react";

// Shared "search text + unique sorted values + filtered results" triplet
// for the reference-card pickers. `extractor` is a plain field-accessor,
// deliberately left out of the memo deps so callers don't need to
// useCallback-wrap it.
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
