import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GROSS_MARGIN_REF_QUERY_KEY } from "@/shared/lib/grossMarginReferenceQueryKeys";
import { useCommissions } from "@/entities/grossMarginCommission";
import { useCostReferences } from "@/entities/grossMarginCostReference";
import { useRebates } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { useTransportCosts, type TransportCostRow } from "@/entities/grossMarginTransportCost";
import { useVarietyDesegregations } from "@/entities/grossMarginVarietyDesegregation";
import { useYields } from "@/entities/grossMarginYield";
import { recomputeSalesRow, type QuoteOverrides } from "./recompute";
import type { QuoteScenario } from "./quoteScenarios";
import { buildSyntheticBaseline, buildManualBaseline } from "./quoteSyntheticRow";
import {
  defaultPackQuantity,
  findCommissionForRow,
  findRebateForRow,
  findTransportCostForRow,
} from "./quoteScenarioReferences";
import type { NewVarietyShape } from "../ui/QuoteSimulatorNewCustomerPicker";

export type QuoteFlow = "existing" | "new-customer" | "new-variety";

// A discriminated union replacing what used to be 3 separately-synced
// booleans -- its shape makes invalid combinations (e.g. "manual entry
// with a synthetic transport cost") unrepresentable.
type QuoteEntry =
  | { kind: "existing"; row: SalesRow }
  | { kind: "new-customer-synthetic"; row: SalesRow; transportCost: TransportCostRow | null }
  | { kind: "new-customer-manual"; row: SalesRow }
  | { kind: "new-variety"; row: SalesRow; isExistingCustomer: boolean };

function isNewCustomerEntry(entry: QuoteEntry): boolean {
  switch (entry.kind) {
    case "existing":
      return false;
    case "new-customer-synthetic":
    case "new-customer-manual":
      return true;
    case "new-variety":
      return !entry.isExistingCustomer;
  }
}

export function useQuoteSimulatorState(rows: SalesRow[], refreshKey?: number | string) {
  const queryClient = useQueryClient();
  const { commissions, isLoading: commissionsLoading } = useCommissions();
  const { rebates, isLoading: rebatesLoading } = useRebates();
  const { transportCosts, isLoading: transportCostsLoading } = useTransportCosts();
  const { varietyDesegregations: varietyDesegregation, isLoading: varietyDesegregationLoading } = useVarietyDesegregations();
  const { costReferences, isLoading: costReferencesLoading } = useCostReferences();
  const { yields, isLoading: yieldsLoading } = useYields();
  // True only on a genuine cold load -- once any one of these has cached
  // data they all do (same navigation lifecycle), so this never re-blanks
  // the UI on an ordinary background revalidation.
  const isLoading =
    commissionsLoading && rebatesLoading && transportCostsLoading && varietyDesegregationLoading && costReferencesLoading && yieldsLoading;

  const [selectedEntry, setSelectedEntry] = useState<QuoteEntry | null>(null);
  const [overrides, setOverrides] = useState<QuoteOverrides>({});
  // Bumped on every overrides reset and used as the Inputs Panel's React
  // `key`, forcing a fresh remount so its local `texts`/`errors` state can't
  // keep shadowing the newly-reset overrides/baseline.
  const [selectionGeneration, setSelectionGeneration] = useState(0);
  // Lifted (not local to the inputs panel) so the target-margin solver offers
  // exactly the same transport lever the inputs panel is currently showing.
  const [transportMode, setTransportMode] = useState<"direct" | "pallet">("direct");
  // Quantity for the pack-pricing card -- defaults to the row's real case
  // size, or 1 for mixed-herb rows (already whole-pack priced).
  const [packQuantity, setPackQuantity] = useState(1);
  const [quoteFlow, setQuoteFlow] = useState<QuoteFlow>("existing");

  const selectedRow = selectedEntry?.row ?? null;
  const isNewCustomerQuote = selectedEntry ? isNewCustomerEntry(selectedEntry) : false;

  // Kept as `loadReferenceData` (same name/shape the UI already calls as
  // `onSaved` after "save as Cost Reference") -- now an invalidation instead
  // of a manual refetch, since the 6 resources above are React Query-backed.
  const loadReferenceData = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: GROSS_MARGIN_REF_QUERY_KEY });
  }, [queryClient]);

  // Compares the actual value, not a "have we rendered yet" boolean flag --
  // a boolean ref survives React StrictMode's double-invocation of this
  // effect in dev (the ref isn't reset between the two simulated passes),
  // so it would read as "no longer first render" on the second pass and
  // invalidate immediately on every real mount too. Comparing refreshKey
  // itself is immune: both StrictMode passes see the same value, so neither
  // looks like a genuine change.
  const previousRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (previousRefreshKey.current === refreshKey) return;
    previousRefreshKey.current = refreshKey;
    loadReferenceData();
  }, [refreshKey, loadReferenceData]);

  const commission = useMemo(
    () => (selectedRow ? findCommissionForRow(commissions, selectedRow) : null),
    [commissions, selectedRow]
  );
  const rebate = useMemo(() => (selectedRow ? findRebateForRow(rebates, selectedRow) : null), [rebates, selectedRow]);
  const transportCost = useMemo(() => {
    if (!selectedEntry) return null;
    // A new customer's name never matches a real DivisionTransportCost row,
    // so use the synthetic estimate built alongside the synthetic baseline
    // instead of the always-empty real lookup.
    if (selectedEntry.kind === "new-customer-synthetic") return selectedEntry.transportCost;
    if (isNewCustomerEntry(selectedEntry)) return null;
    return findTransportCostForRow(transportCosts, selectedEntry.row);
  }, [transportCosts, selectedEntry]);
  const costReference = useMemo(
    () =>
      selectedRow
        ? costReferences.find((c) => c.Variety === selectedRow.Variety && c.Warehouse === selectedRow.Warehouse) ?? null
        : null,
    [costReferences, selectedRow]
  );
  const yieldRow = useMemo(
    () => (selectedRow ? yields.find((y) => y.CalculatedSKU === selectedRow.CalculatedSKU) ?? null : null),
    [yields, selectedRow]
  );
  const children = useMemo(
    () => (selectedRow ? varietyDesegregation.filter((c) => c.ParentVariety === selectedRow.Variety) : []),
    [varietyDesegregation, selectedRow]
  );

  const inputs = useMemo(
    () => (selectedRow ? { baseline: selectedRow, commission, rebate, transportCost } : null),
    [selectedRow, commission, rebate, transportCost]
  );

  const result = useMemo(() => (inputs ? recomputeSalesRow(inputs, overrides) : null), [inputs, overrides]);

  const handleSelectRow = useCallback((row: SalesRow) => {
    setSelectedEntry({ kind: "existing", row });
    setOverrides({});
    setSelectionGeneration((g) => g + 1);
    setTransportMode("direct");
    setPackQuantity(defaultPackQuantity(row));
  }, []);

  const handleLoadScenario = useCallback(
    (scenario: QuoteScenario) => {
      const live = rows.find(
        (r) =>
          r.CalculatedSKU === scenario.baselineIdentity.calculatedSKU &&
          r.SKUMeasure === scenario.baselineIdentity.skuMeasure &&
          r.Customer === scenario.baselineIdentity.customer &&
          r.Warehouse === scenario.baselineIdentity.warehouse
      );
      const nextRow = live ?? scenario.baselineSnapshot;
      setQuoteFlow("existing");
      setSelectedEntry({ kind: "existing", row: nextRow });
      setOverrides(scenario.overrides);
      setSelectionGeneration((g) => g + 1);
      setTransportMode(scenario.overrides.palletCostOverride !== undefined ? "pallet" : "direct");
      // v2 scenarios remember the exact quantity the user had selected;
      // v1 scenarios (saved before that field existed) fall back to the
      // same default a fresh row-selection would use.
      setPackQuantity(scenario.packQuantity ?? defaultPackQuantity(nextRow));
      if (!live) {
        toast.warning("This row is no longer in the current dataset — showing the last-known values.");
      }
    },
    [rows]
  );

  const handleCreateNewCustomerQuote = useCallback(
    (variety: string, warehouse: string, customerName: string) => {
      const result = buildSyntheticBaseline(variety, warehouse, customerName, rows, transportCosts);
      if (result) {
        if (result.costFieldsDisagree.length > 0) {
          toast.warning(
            `Existing rows for this Variety+Warehouse disagree on: ${result.costFieldsDisagree.join(", ")} — used the first match, double-check before quoting.`
          );
        }
        setSelectedEntry({ kind: "new-customer-synthetic", row: result.row, transportCost: result.transportCost });
        setOverrides({});
        setSelectionGeneration((g) => g + 1);
        setTransportMode("direct");
        setPackQuantity(defaultPackQuantity(result.row));
        return;
      }

      // No rows for this exact Variety+Warehouse -- fall through to a manual
      // starting point, borrowing the package size from wherever else this
      // Variety ships, since that's a property of the product, not the warehouse.
      const anyRowForVariety = rows.find((r) => r.Variety === variety && r.MeasurementUnitValue !== null);
      if (!anyRowForVariety || anyRowForVariety.MeasurementUnitValue === null) {
        toast.error(`No data found for "${variety}" anywhere — can't determine its package size.`);
        return;
      }
      const manualRow = buildManualBaseline(variety, warehouse, customerName, {
        measurementUnitValue: anyRowForVariety.MeasurementUnitValue,
        packQty: anyRowForVariety.PackQty,
        skuMeasure: anyRowForVariety.SKUMeasure,
      });
      setSelectedEntry({ kind: "new-customer-manual", row: manualRow });
      setOverrides({});
      setSelectionGeneration((g) => g + 1);
      setTransportMode("direct");
      setPackQuantity(defaultPackQuantity(manualRow));
    },
    [rows, transportCosts]
  );

  // The "New Variety" tab -- a brand-new product, never sold anywhere.
  // Always manual, but unlike the "new customer" flow above, the customer
  // picked here might be an EXISTING one, so `transportCost`'s useMemo can
  // still try the real lookup (see isNewCustomerEntry above).
  const handleCreateNewVarietyQuote = useCallback(
    (variety: string, warehouse: string, customerName: string, isExistingCustomer: boolean, shape: NewVarietyShape) => {
      const manualRow = buildManualBaseline(variety, warehouse, customerName, shape);
      setSelectedEntry({ kind: "new-variety", row: manualRow, isExistingCustomer });
      setOverrides({});
      setSelectionGeneration((g) => g + 1);
      setTransportMode("direct");
      setPackQuantity(defaultPackQuantity(manualRow));
    },
    []
  );

  // Lets a "none"-mode row pick a hypothetical sourcing basis so the Inputs
  // Panel's cost fields become enterable -- purely local state, never sent
  // anywhere. Bumps selectionGeneration since this resets which fields apply.
  const handleModeSelect = useCallback((newMode: "A" | "B") => {
    setSelectedEntry((entry) => (entry ? { ...entry, row: { ...entry.row, Flag: newMode === "A" ? 1 : 0 } } : entry));
    setSelectionGeneration((g) => g + 1);
  }, []);

  const handleQuoteFlowChange = useCallback((flow: QuoteFlow) => {
    setQuoteFlow(flow);
    setSelectedEntry(null);
    setOverrides({});
  }, []);

  return {
    isLoading,
    commissions,
    rebates,
    transportCosts,
    quoteFlow,
    selectedRow,
    isNewCustomerQuote,
    overrides,
    setOverrides,
    selectionGeneration,
    transportMode,
    setTransportMode,
    packQuantity,
    setPackQuantity,
    commission,
    transportCost,
    costReference,
    yieldRow,
    children,
    inputs,
    result,
    loadReferenceData,
    handleSelectRow,
    handleLoadScenario,
    handleCreateNewCustomerQuote,
    handleCreateNewVarietyQuote,
    handleModeSelect,
    handleQuoteFlowChange,
  };
}
