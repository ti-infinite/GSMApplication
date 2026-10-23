// Shared query-key prefix for every Gross Margin "reference data" resource
// (commission, rebate, cost reference, extra cost, transport cost, yields,
// variety desegregation) -- both Quote Simulator and the Updates tab read
// these independently, so a consistent prefix lets one invalidateQueries
// call (after any edit, from either page) refresh all of them at once.
export const GROSS_MARGIN_REF_QUERY_KEY = ["gross-margin-ref"] as const;

export function grossMarginRefQueryKey(resource: string) {
  return [...GROSS_MARGIN_REF_QUERY_KEY, resource] as const;
}
