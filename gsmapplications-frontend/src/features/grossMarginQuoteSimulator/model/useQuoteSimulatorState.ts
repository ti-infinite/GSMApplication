import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchCommissions, type CommissionRow } from "@/entities/grossMarginCommission";
import { costReferenceApi, type CostReferenceRow } from "@/entities/grossMarginCostReference";
import { fetchRebates, type RebateRow } from "@/entities/grossMarginRebate";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { transportCostApi, type TransportCostRow } from "@/entities/grossMarginTransportCost";
import { varietyDesegregationApi, type VarietyDesegregationRow } from "@/entities/grossMarginVarietyDesegregation";
import { yieldsApi, type YieldRow } from "@/entities/grossMarginYield";
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

// Replaces what used to be 3 separately-synced pieces of state
// (isNewCustomerQuote/isManualEntry/syntheticTransportCost, with every
// handler below setting all 3 by hand) with one value whose shape makes
// invalid combinations unrepresentable -- e.g. "manual entry with a
// synthetic transport cost" could never be constructed by accident.
// REFACTOR_PLAN.md phase 02, items 1+2 -- done together, since the
// discriminated union IS the shape the extracted state model needed;
// extracting the old hand-synced booleans first would mean rewriting this
// again immediately after.
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
  const [isLoading, setIsLoading] = useState(true);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [rebates, setRebates] = useState<RebateRow[]>([]);
  const [transportCosts, setTransportCosts] = useState<TransportCostRow[]>([]);
  const [varietyDesegregation, setVarietyDesegregation] = useState<VarietyDesegregationRow[]>([]);
  const [costReferences, setCostReferences] = useState<CostReferenceRow[]>([]);
  const [yields, setYields] = useState<YieldRow[]>([]);

  const [selectedEntry, setSelectedEntry] = useState<QuoteEntry | null>(null);
  const [overrides, setOverrides] = useState<QuoteOverrides>({});
  // Bumped every time `overrides` is reset below (row switch, scenario load,
  // new-customer quote) and used as the Inputs Panel's React `key` -- forces
  // a fresh remount so its own local `texts`/`errors` state (leftover typed
  // text from whatever was previously selected) can't keep shadowing the
  // newly-reset `overrides`/baseline. Previously this required manually
  // clicking "Reset all" to see correct values after switching rows.
  const [selectionGeneration, setSelectionGeneration] = useState(0);
  // Lifted (not local to the inputs panel) so the target-margin solver can
  // offer/apply exactly the same transport lever the inputs panel is
  // currently showing -- Pallet Cost when negotiating a pallet rate, direct
  // Transport $ otherwise, never a field the user can't also see toggled.
  const [transportMode, setTransportMode] = useState<"direct" | "pallet">("direct");
  // Quantity for the "what do we charge the customer" pack-pricing card --
  // defaults to the row's own real case size for regular herbs, or 1 (one
  // whole blend case) for mixed-herb rows, which are already whole-pack
  // priced. See defaultPackQuantity below.
  const [packQuantity, setPackQuantity] = useState(1);
  const [quoteFlow, setQuoteFlow] = useState<QuoteFlow>("existing");

  const selectedRow = selectedEntry?.row ?? null;
  const isNewCustomerQuote = selectedEntry ? isNewCustomerEntry(selectedEntry) : false;

  // Extracted (not just a one-shot mount effect) so a successful save from
  // the new "save this as a Cost Reference" flow can trigger the exact same
  // refetch afterward -- the picker/lookups need to see the newly-created
  // row immediately, not just on next page load.
  const loadReferenceData = useCallback(async () => {
    try {
      const [c, r, t, vd, cr, y] = await Promise.all([
        fetchCommissions(),
        fetchRebates(),
        transportCostApi.list(),
        varietyDesegregationApi.list(),
        costReferenceApi.list(),
        yieldsApi.list(),
      ]);
      setCommissions(c);
      setRebates(r);
      setTransportCosts(t);
      setVarietyDesegregation(vd);
      setCostReferences(cr);
      setYields(y);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load reference data.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadReferenceData().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only;
    // refreshKey changes are handled by the separate effect below, which
    // deliberately does NOT toggle `isLoading` (that would blank the whole
    // simulator behind a skeleton mid-use every time someone hits Refresh).
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadReferenceData();
  }, [refreshKey, loadReferenceData]);

  const commission = useMemo(
    () => (selectedRow ? findCommissionForRow(commissions, selectedRow) : null),
    [commissions, selectedRow]
  );
  const rebate = useMemo(() => (selectedRow ? findRebateForRow(rebates, selectedRow) : null), [rebates, selectedRow]);
  const transportCost = useMemo(() => {
    if (!selectedEntry) return null;
    // A new customer's name will never match a real DivisionTransportCost
    // row (it isn't real yet) -- use the synthetic estimate built alongside
    // the synthetic baseline instead of the always-empty real lookup. An
    // existing customer picked from the New Variety tab is NOT forced onto
    // this path -- see handleCreateNewVarietyQuote below.
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

      // No existing rows for this exact Variety+Warehouse (an existing
      // Variety just missing this warehouse) -- fall through to a manual
      // starting point, borrowing the package size from wherever else this
      // Variety already ships, since that's a property of the product, not
      // the warehouse. A genuinely new Variety never reaches this tab
      // anymore -- see quote-simulator-new-variety-picker.tsx.
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

  // The "New Variety" tab -- a genuinely brand-new product, never sold
  // anywhere. Always manual (there's nothing to average from), but unlike
  // the "new customer" flow above, the customer picked here might be an
  // EXISTING one -- so `transportCost`'s own useMemo should be allowed to
  // try the real lookup for them, not forced onto the always-null synthetic
  // path. Only a genuinely new customer name forces that path (see
  // isNewCustomerEntry above), same reasoning as handleCreateNewCustomerQuote.
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

  // Lets a "none"-mode row (no matched purchase cost) pick a hypothetical
  // sourcing basis so the Inputs Panel's cost fields become enterable --
  // purely local state, never sent anywhere; only Packing/Sticker/etc.
  // values the user explicitly saves via the save-reference flow touch the
  // server. Also bumps selectionGeneration since this effectively resets
  // what fields are relevant, same as a fresh row/scenario selection.
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
