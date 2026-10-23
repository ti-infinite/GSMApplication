import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { buildSyntheticBaseline, buildManualBaseline, buildSkuMeasure, isManualSku } from "./quoteSyntheticRow";
import { fetchPurchaseCost, type PurchaseCostLookup } from "../api/fetchPurchaseCost";
import { savedQuoteToScenario, takeSavedQuoteForSimulator } from "./savedQuotes";
import { estimateQuoteCosts, type EstimateTarget, type QuoteCostEstimates } from "./quoteCostEstimates";
import {
  defaultPackQuantity,
  findCommissionForRow,
  findRebateForRow,
  findTransportCostForRow,
} from "./quoteScenarioReferences";
import type { NewVarietyShape } from "../ui/QuoteSimulatorNewCustomerProductPicker";


export type QuoteFlow = "existing" | "new-customer-product";


type QuoteEntry =
  | { kind: "existing"; row: SalesRow }
  | { kind: "new-customer-synthetic"; row: SalesRow; transportCost: TransportCostRow | null; isExistingCustomer: boolean }
  | {
      kind: "new-customer-manual";
      row: SalesRow;
      isExistingCustomer: boolean;
      estimates: QuoteCostEstimates | null;
      estimateTarget: EstimateTarget | null;
      shape: { measurementUnitValue: number; packQty: number | null; skuMeasure?: string; calculatedSku?: string | null } | null;
      purchaseCostLookup: PurchaseCostLookup | undefined;
      transportCost: TransportCostRow | null;
    };

function isNewCustomerEntry(entry: QuoteEntry): boolean {
  return entry.kind !== "existing" && !entry.isExistingCustomer;
}

export function useQuoteSimulatorState(rows: SalesRow[], refreshKey?: number | string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { commissions, isLoading: commissionsLoading } = useCommissions();
  const { rebates, isLoading: rebatesLoading } = useRebates();
  const { transportCosts, isLoading: transportCostsLoading } = useTransportCosts();
  const { varietyDesegregations: varietyDesegregation, isLoading: varietyDesegregationLoading } = useVarietyDesegregations();
  const { costReferences, isLoading: costReferencesLoading } = useCostReferences();
  const { yields, isLoading: yieldsLoading } = useYields();

  const isLoading =
    commissionsLoading && rebatesLoading && transportCostsLoading && varietyDesegregationLoading && costReferencesLoading && yieldsLoading;

  const [selectedEntry, setSelectedEntry] = useState<QuoteEntry | null>(null);
  const [overrides, setOverrides] = useState<QuoteOverrides>({});
 
  const [selectionGeneration, setSelectionGeneration] = useState(0);

  const [transportMode, setTransportMode] = useState<"direct" | "pallet">("direct");

  const [packQuantity, setPackQuantity] = useState(1);
  const [quoteFlow, setQuoteFlow] = useState<QuoteFlow>("existing");

  const selectedRow = selectedEntry?.row ?? null;
  const isNewCustomerQuote = selectedEntry ? isNewCustomerEntry(selectedEntry) : false;
 
  const calculatedSkuForSave =
    selectedEntry?.kind === "new-customer-manual" && !isManualSku(selectedEntry.row.CalculatedSKU)
      ? selectedEntry.row.CalculatedSKU
      : null;

 
  const loadReferenceData = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: GROSS_MARGIN_REF_QUERY_KEY });
  }, [queryClient]);


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

    if (selectedEntry.kind === "new-customer-synthetic") return selectedEntry.transportCost;

    if (selectedEntry.kind === "new-customer-manual") {
      return selectedEntry.transportCost ?? (isNewCustomerEntry(selectedEntry) ? null : findTransportCostForRow(transportCosts, selectedEntry.row));
    }
    if (isNewCustomerEntry(selectedEntry)) return null;
    return findTransportCostForRow(transportCosts, selectedEntry.row);
  }, [transportCosts, selectedEntry]);
  const estimates = selectedEntry?.kind === "new-customer-manual" ? selectedEntry.estimates : null;
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

      setPackQuantity(scenario.packQuantity ?? defaultPackQuantity(nextRow));
      if (!live) {
        toast.warning(t("grossMargin.simulator.warnings.rowGone"));
      }
    },
    [rows, t]
  );


  const buildManualEntry = useCallback(
    (
      variety: string,
      warehouse: string,
      customerName: string,
      isExistingCustomer: boolean,
      shape: { measurementUnitValue: number; packQty: number | null; skuMeasure?: string; calculatedSku?: string | null },
      purchaseCostLookup: PurchaseCostLookup | undefined,
      flag: 0 | 1 | null
    ): Extract<QuoteEntry, { kind: "new-customer-manual" }> => {
      const calculatedSku = shape.calculatedSku && !isManualSku(shape.calculatedSku) ? shape.calculatedSku : null;
      const target: EstimateTarget = {
        variety,
        warehouse,
        customer: customerName,
        isExistingCustomer,
        calculatedSku,
        measurementUnitValue: shape.measurementUnitValue,
        packQty: shape.packQty,
        flag,
      };

      const rawLookup = purchaseCostLookup ?? { flag: null, purchaseCost: null };
      const lookup: PurchaseCostLookup =
        flag !== null && rawLookup.purchaseCost !== null && rawLookup.flag !== flag
          ? { flag, purchaseCost: null }
          : flag !== null
            ? { ...rawLookup, flag }
            : rawLookup;
      const est = estimateQuoteCosts(target, { rows, costReferences, transportCosts, yields }, lookup);
      const row = buildManualBaseline(variety, warehouse, customerName, shape, lookup, est);
      return {
        kind: "new-customer-manual",
        row,
        isExistingCustomer,
        estimates: est,
        estimateTarget: target,
        shape,
        purchaseCostLookup,
        transportCost: est.transportCostRow,
      };
    },
    [rows, costReferences, transportCosts, yields]
  );

  const handoffConsumed = useRef(false);
  useEffect(() => {
    if (handoffConsumed.current || rows.length === 0) return;
    const saved = takeSavedQuoteForSimulator();
    if (!saved) return;
    handoffConsumed.current = true;
    handleLoadScenario(savedQuoteToScenario(saved));
    toast.info(t("grossMargin.simulator.scenarios.reopened", { name: saved.QuoteName }));
  }, [rows, handleLoadScenario, t]);


  const handleCreateQuote = useCallback(
    async (variety: string, warehouse: string, customerName: string, isExistingCustomer: boolean, shape: NewVarietyShape | null) => {
      if (shape === null) {
        const result = buildSyntheticBaseline(variety, warehouse, customerName, rows, transportCosts);
        if (result) {
          if (result.costFieldsDisagree.length > 0) {
            toast.warning(t("grossMargin.simulator.warnings.costFieldsDisagree", { fields: result.costFieldsDisagree.join(", ") }));
          }
          setSelectedEntry({ kind: "new-customer-synthetic", row: result.row, transportCost: result.transportCost, isExistingCustomer });
          setOverrides({});
          setSelectionGeneration((g) => g + 1);
          setTransportMode("direct");
          setPackQuantity(defaultPackQuantity(result.row));
          return;
        }

        const anyRowForVariety = rows.find((r) => r.Variety === variety && r.MeasurementUnitValue !== null);
        if (!anyRowForVariety || anyRowForVariety.MeasurementUnitValue === null) {
          toast.error(t("grossMargin.simulator.warnings.noDataForVariety", { variety }));
          return;
        }

        const purchaseCostLookup = isManualSku(anyRowForVariety.CalculatedSKU)
          ? undefined
          : await fetchPurchaseCost(anyRowForVariety.CalculatedSKU, anyRowForVariety.SKUMeasure, warehouse);
        const entry = buildManualEntry(
          variety,
          warehouse,
          customerName,
          isExistingCustomer,
          {
            measurementUnitValue: anyRowForVariety.MeasurementUnitValue,
            packQty: anyRowForVariety.PackQty,
            skuMeasure: anyRowForVariety.SKUMeasure,
            calculatedSku: anyRowForVariety.CalculatedSKU,
          },
          purchaseCostLookup,
          purchaseCostLookup?.flag ?? null
        );
        setSelectedEntry(entry);
        setOverrides({});
        setSelectionGeneration((g) => g + 1);
        setTransportMode("direct");
        setPackQuantity(defaultPackQuantity(entry.row));
        return;
      }

      const purchaseCostLookup = shape.calculatedSku
        ? await fetchPurchaseCost(shape.calculatedSku, buildSkuMeasure(shape.calculatedSku, shape.measurementUnitValue), warehouse)
        : undefined;

      const entry = buildManualEntry(
        variety,
        warehouse,
        customerName,
        isExistingCustomer,
        shape,
        purchaseCostLookup,
        shape.flag ?? purchaseCostLookup?.flag ?? null
      );
      setSelectedEntry(entry);
      setOverrides({});
      setSelectionGeneration((g) => g + 1);
      setTransportMode("direct");
      setPackQuantity(defaultPackQuantity(entry.row));
    },
    [rows, transportCosts, t, buildManualEntry]
  );


  const handleModeSelect = useCallback(
    (newMode: "A" | "B") => {
      const flag = newMode === "A" ? 1 : 0;
      setSelectedEntry((entry) => {
        if (!entry) return entry;

        if (entry.kind === "new-customer-manual" && entry.shape) {
          const rebuilt = buildManualEntry(
            entry.row.Variety,
            entry.row.Warehouse,
            entry.row.Customer,
            entry.isExistingCustomer,
            entry.shape,
            entry.purchaseCostLookup,
            flag
          );
          return rebuilt;
        }
        return { ...entry, row: { ...entry.row, Flag: flag } };
      });
      setSelectionGeneration((g) => g + 1);
    },
    [buildManualEntry]
  );

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
    calculatedSkuForSave,
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
    estimates,
    loadReferenceData,
    handleSelectRow,
    handleLoadScenario,
    handleCreateQuote,
    handleModeSelect,
    handleQuoteFlowChange,
  };
}
