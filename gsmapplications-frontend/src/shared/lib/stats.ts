// Simple (unweighted) mean across whatever values are given, ignoring nulls.
// Used wherever a per-row metric (Gross Margin, Avg Unit Price, ...) needs
// averaging across a group -- entities/grossMarginSalesRow's own
// aggregation/overview stats. No business logic of its own (just
// arithmetic), so it lives here rather than inside an entity, letting any
// future consumer import the one copy instead of duplicating it.
export function avgOf(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
