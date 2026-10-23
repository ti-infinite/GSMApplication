import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { CostReferenceRow } from "@/entities/grossMarginCostReference";
import type { TransportCostRow } from "@/entities/grossMarginTransportCost";
import type { YieldRow } from "@/entities/grossMarginYield";
import type { PurchaseCostLookup } from "../api/fetchPurchaseCost";


export type EstimateSource = "exact" | "estimated" | "none";

export type EstimateBasis =
  | "exactProduct"
  | "purchaseLookup"
  | "yieldTable"
  | "sameSkuMeasureWarehouseUnit"
  | "sameSkuWarehousePound"
  | "sameSkuAnyWarehousePound"
  | "sameSkuRows"
  | "sameHerbRows"
  | "packagingSizePackWarehouseHerb"
  | "packagingSizePackWarehouse"
  | "packagingSizeWarehouse"
  | "packagingSize"
  | "packagingWarehouse"
  | "packaging"
  | "sizeWarehouse"
  | "customerWarehouseSizePack"
  | "customerWarehouseSize"
  | "customerSize"
  | "customerWarehouse"
  | "warehouseSizePackPackaging"
  | "warehouseSizePack"
  | "warehouseSize"
  | "warehouse"
  | "size"
  | "sameVariety"
  | "sameSkuSizePack"
  | "sameSkuSize"
  | "none";

export interface FieldEstimate {
  value: number | null;
  source: EstimateSource;
  basis: EstimateBasis;
  sampleSize: number;
}

export interface PurchaseCostEstimate extends FieldEstimate {
  flag: 0 | 1 | null;
}

export type Packaging = "CLAMSHELL" | "BAG" | "BOX" | "TUB" | "BUNCH" | "POTTED HERBS";

export interface EstimateTarget {
  variety: string;
  warehouse: string;
  customer: string;
  isExistingCustomer: boolean;
  calculatedSku: string | null;
  measurementUnitValue: number;
  packQty: number | null;
  flag: 0 | 1 | null;
}

export interface EstimateSources {
  rows: SalesRow[];
  costReferences: CostReferenceRow[];
  transportCosts: TransportCostRow[];
  yields: YieldRow[];
}

export interface QuoteCostEstimates {
  purchaseCost: PurchaseCostEstimate;
  yield: FieldEstimate;
  packing: FieldEstimate;
  sticker: FieldEstimate;
  box: FieldEstimate; 
  labourProd: FieldEstimate;
  labourRepack: FieldEstimate;
  labourAssembler: FieldEstimate;
  transport: FieldEstimate; 
  avgUnitPrice: FieldEstimate; 
  transportCostRow: TransportCostRow | null;
}

export const ESTIMATE_KEY_BY_OVERRIDE: Record<string, keyof QuoteCostEstimates> = {
  purchaseCostOverride: "purchaseCost",
  yieldOverride: "yield",
  packingOverride: "packing",
  stickerOverride: "sticker",
  boxOverride: "box",
  labourProdOverride: "labourProd",
  labourRepackOverride: "labourRepack",
  labourAssemblerOverride: "labourAssembler",
  transportOverride: "transport",
  avgUnitPriceBaseOverride: "avgUnitPrice",
};

export const MIN_SAMPLE = 1;

const NONE: FieldEstimate = { value: null, source: "none", basis: "none", sampleSize: 0 };

export function median(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

const PACKAGING_WORDS: { word: RegExp; packaging: Packaging }[] = [
  { word: /\bCLAMSHELL\b|\bCLAM\b/, packaging: "CLAMSHELL" },
  { word: /\bPOTTED\b/, packaging: "POTTED HERBS" },
  { word: /\bBUNCH(ES|ED)?\b/, packaging: "BUNCH" },
  { word: /\bTUB\b/, packaging: "TUB" },
  { word: /\bBAG\b|\bBAGS\b/, packaging: "BAG" },
  { word: /\bBOX\b/, packaging: "BOX" },
];

export function inferPackaging(variety: string): Packaging | null {
  const upper = variety.toUpperCase();
  const afterDash = upper.includes(" - ") ? upper.slice(upper.indexOf(" - ") + 3) : upper;
  let best: { index: number; packaging: Packaging } | null = null;
  for (const { word, packaging } of PACKAGING_WORDS) {
    const m = word.exec(afterDash);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, packaging };
  }
  return best?.packaging ?? null;
}

export function herbNameOf(variety: string): string {
  const upper = variety.trim().toUpperCase();
  const dash = upper.indexOf(" - ");
  if (dash > 0) return upper.slice(0, dash).trim();
  return upper.split(/\s+/)[0] ?? upper;
}

interface PoolEntry {
  row: SalesRow;
  packaging: Packaging | null;
  herb: string;
  sku: string;
  size: number | null;
  packQty: number | null;
  warehouse: string;
  flag: 0 | 1 | null;
}


function buildCostPool(rows: SalesRow[], target: EstimateTarget): PoolEntry[] {
  const seen = new Set<string>();
  const pool: PoolEntry[] = [];
  for (const row of rows) {
    if (row.IsMixedHerbWholePack === 1) continue;
    if (row.Variety === target.variety && row.Warehouse === target.warehouse) continue;
    const key = `${row.Variety}␟${row.Warehouse}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({
      row,
      packaging: inferPackaging(row.Variety),
      herb: herbNameOf(row.Variety),
      sku: row.CalculatedSKU,
      size: row.MeasurementUnitValue,
      packQty: row.PackQty,
      warehouse: row.Warehouse,
      flag: row.Flag,
    });
  }
  return pool;
}

interface Rung<T> {
  basis: EstimateBasis;
  pred: (e: T) => boolean;
}

function ladder<T>(pool: T[], rungs: Rung<T>[], pick: (e: T) => number | null): FieldEstimate {
  for (const rung of rungs) {
    const values = pool.filter(rung.pred).map(pick).filter((v): v is number => v !== null && Number.isFinite(v));
    if (values.length >= MIN_SAMPLE) {
      return { value: median(values), source: "estimated", basis: rung.basis, sampleSize: values.length };
    }
  }
  return NONE;
}

function sameNumber(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) < 1e-9;
}

// The packaging-and-size ladder shared by every per-unit cost column.
function packagingRungs(t: EstimateTarget, herb: string, pkg: Packaging | null): Rung<PoolEntry>[] {
  const size = t.measurementUnitValue;
  const pk = t.packQty;
  const whs = t.warehouse;
  const rungs: Rung<PoolEntry>[] = [];
  if (pkg) {
    rungs.push(
      { basis: "packagingSizePackWarehouseHerb", pred: (e) => e.packaging === pkg && sameNumber(e.size, size) && sameNumber(e.packQty, pk) && e.warehouse === whs && e.herb === herb },
      { basis: "packagingSizePackWarehouse", pred: (e) => e.packaging === pkg && sameNumber(e.size, size) && sameNumber(e.packQty, pk) && e.warehouse === whs },
      { basis: "packagingSizeWarehouse", pred: (e) => e.packaging === pkg && sameNumber(e.size, size) && e.warehouse === whs },
      { basis: "packagingSize", pred: (e) => e.packaging === pkg && sameNumber(e.size, size) },
      { basis: "packagingWarehouse", pred: (e) => e.packaging === pkg && e.warehouse === whs },
      { basis: "packaging", pred: (e) => e.packaging === pkg }
    );
  }
  rungs.push({ basis: "sizeWarehouse", pred: (e) => sameNumber(e.size, size) && e.warehouse === whs });
  return rungs;
}

function estimateTransport(
  target: EstimateTarget,
  rows: SalesRow[],
  transportCosts: TransportCostRow[],
  pkg: Packaging | null
): { estimate: FieldEstimate; transportCostRow: TransportCostRow | null } {
  const size = target.measurementUnitValue;
  const pk = target.packQty;
  const whs = target.warehouse;

  if (target.isExistingCustomer) {
    const exact = transportCosts.find((tc) => tc.DivisionName === target.customer && sameNumber(tc.MeasurementUnitValue, size));
    if (exact && exact.TransportUnitCost !== null) {
      return {
        estimate: { value: exact.TransportUnitCost, source: "exact", basis: "exactProduct", sampleSize: 1 },
        transportCostRow: exact,
      };
    }
    const own = rows.filter((r) => r.Customer === target.customer && r.IsMixedHerbWholePack !== 1 && r.Transport !== null);
    const estimate = ladder<SalesRow>(
      own,
      [
        { basis: "customerWarehouseSizePack", pred: (r) => r.Warehouse === whs && sameNumber(r.MeasurementUnitValue, size) && sameNumber(r.PackQty, pk) },
        { basis: "customerWarehouseSize", pred: (r) => r.Warehouse === whs && sameNumber(r.MeasurementUnitValue, size) },
        { basis: "customerSize", pred: (r) => sameNumber(r.MeasurementUnitValue, size) },
        { basis: "customerWarehouse", pred: (r) => r.Warehouse === whs },
      ],
      (r) => r.Transport
    );
    return { estimate, transportCostRow: null };
  }

  const divisionWarehouses = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!divisionWarehouses.has(r.Customer)) divisionWarehouses.set(r.Customer, new Set());
    divisionWarehouses.get(r.Customer)!.add(r.Warehouse);
  }
  const packagingCode = pkg === "CLAMSHELL" ? "CLA" : pkg === "BAG" ? "BAG" : pkg === "BOX" ? "BOX" : null;
  const pool = transportCosts.filter((tc) => tc.TransportUnitCost !== null);
  const atWarehouse = (tc: TransportCostRow) =>
    tc.Warehouse === whs || (tc.Warehouse === null && (divisionWarehouses.get(tc.DivisionName)?.has(whs) ?? false));
  const packMatches = (tc: TransportCostRow) => tc.PackQty === null || sameNumber(tc.PackQty, pk);
  const rungs: Rung<TransportCostRow>[] = [];
  if (packagingCode) {
    rungs.push({
      basis: "warehouseSizePackPackaging",
      pred: (tc) => atWarehouse(tc) && sameNumber(tc.MeasurementUnitValue, size) && packMatches(tc) && tc.Packaging === packagingCode,
    });
  }
  rungs.push(
    { basis: "warehouseSizePack", pred: (tc) => atWarehouse(tc) && sameNumber(tc.MeasurementUnitValue, size) && packMatches(tc) },
    { basis: "warehouseSize", pred: (tc) => atWarehouse(tc) && sameNumber(tc.MeasurementUnitValue, size) },
    { basis: "warehouse", pred: (tc) => atWarehouse(tc) },
    { basis: "size", pred: (tc) => sameNumber(tc.MeasurementUnitValue, size) }
  );
  const estimate = ladder(pool, rungs, (tc) => tc.TransportUnitCost);
  if (estimate.source === "none") return { estimate, transportCostRow: null };

  const winning = rungs.find((r) => r.basis === estimate.basis)!;
  const sample = pool.filter(winning.pred);
  const transportCostRow: TransportCostRow = {
    Id: -1,
    DivisionName: target.customer,
    Type: null,
    Packaging: packagingCode,
    MeasurementUnitValue: size,
    Qty: median(sample.map((tc) => tc.Qty)),
    BoxesXPallet: median(sample.map((tc) => tc.BoxesXPallet)),
    UnitsXPallet: median(sample.map((tc) => tc.UnitsXPallet)),
    PalletCost: median(sample.map((tc) => tc.PalletCost)),
    TransportUnitCost: estimate.value,
    Warehouse: whs,
    PackQty: pk,
    CreatedAt: "",
    UpdatedAt: "",
  };
  return { estimate, transportCostRow };
}

function estimatePurchaseCost(
  target: EstimateTarget,
  pool: PoolEntry[],
  lookup: PurchaseCostLookup | undefined
): PurchaseCostEstimate {
  if (lookup && lookup.purchaseCost !== null) {
    return { value: lookup.purchaseCost, source: "exact", basis: "purchaseLookup", sampleSize: 1, flag: lookup.flag };
  }
  const sku = target.calculatedSku;
  if (!sku) return { ...NONE, flag: null };
  const skuMeasure = `${sku}${target.measurementUnitValue.toFixed(4)}`;
  const allowUnit = target.flag === null || target.flag === 1;
  const allowPound = target.flag === null || target.flag === 0;
  const rungs: (Rung<PoolEntry> & { flag: 0 | 1 })[] = [];
  if (allowUnit) {
    rungs.push({
      basis: "sameSkuMeasureWarehouseUnit",
      flag: 1,
      pred: (e) => e.flag === 1 && e.row.SKUMeasure === skuMeasure && e.warehouse === target.warehouse,
    });
  }
  if (allowPound) {
    rungs.push(
      { basis: "sameSkuWarehousePound", flag: 0, pred: (e) => e.flag === 0 && e.sku === sku && e.warehouse === target.warehouse },
      { basis: "sameSkuAnyWarehousePound", flag: 0, pred: (e) => e.flag === 0 && e.sku === sku }
    );
  }
  for (const rung of rungs) {
    const values = pool.filter(rung.pred).map((e) => e.row.PurchaseCost).filter((v): v is number => v !== null);
    if (values.length >= MIN_SAMPLE) {
      return { value: median(values), source: "estimated", basis: rung.basis, sampleSize: values.length, flag: rung.flag };
    }
  }
  return { ...NONE, flag: null };
}

export function estimateQuoteCosts(
  target: EstimateTarget,
  sources: EstimateSources,
  purchaseCostLookup?: PurchaseCostLookup
): QuoteCostEstimates {
  const { rows, transportCosts, yields } = sources;
  const pool = buildCostPool(rows, target);
  const herb = herbNameOf(target.variety);
  const pkg = inferPackaging(target.variety);

  const purchaseCost = estimatePurchaseCost(target, pool, purchaseCostLookup);
  const flag = target.flag ?? purchaseCost.flag;

  const poundOnlyPool = pool.filter((e) => e.flag === 0);
  const packagingLadder = packagingRungs(target, herb, pkg);
  const poundOnly = (pick: (e: PoolEntry) => number | null): FieldEstimate =>
    flag === 1 ? NONE : ladder(poundOnlyPool, packagingLadder, pick);
  const anyFlag = (pick: (e: PoolEntry) => number | null): FieldEstimate => ladder(pool, packagingLadder, pick);

  const packing = poundOnly((e) => e.row.Packing);
  const sticker = poundOnly((e) => e.row.Sticker);
  const labourProd = poundOnly((e) => e.row.LabourProd);
  const labourRepack = anyFlag((e) => e.row.LabourRepack);
  const labourAssembler = anyFlag((e) => e.row.LabourAssembler);

  const boxWholePack = anyFlag((e) => (e.row.Box === null ? null : e.row.Box * (e.packQty ?? 1)));
  const box: FieldEstimate =
    boxWholePack.value === null ? boxWholePack : { ...boxWholePack, value: boxWholePack.value / (target.packQty ?? 1) };

  let yieldEstimate: FieldEstimate = NONE;
  if (flag !== 1) {
    const onFile = target.calculatedSku ? yields.find((y) => y.CalculatedSKU === target.calculatedSku) : undefined;
    if (onFile) {
      yieldEstimate = { value: onFile.Yield, source: "exact", basis: "yieldTable", sampleSize: 1 };
    } else {
      yieldEstimate = ladder(
        pool,
        [
          { basis: "sameSkuRows", pred: (e) => target.calculatedSku !== null && e.sku === target.calculatedSku },
          { basis: "sameHerbRows", pred: (e) => e.herb === herb },
        ],
        (e) => e.row.Yield
      );
    }
  }

  const { estimate: transport, transportCostRow } = estimateTransport(target, rows, transportCosts, pkg);

  const priceRows = rows.filter((r) => r.AvgUnitPrice !== null && r.IsMixedHerbWholePack !== 1);
  const avgUnitPrice = ladder<SalesRow>(
    priceRows,
    [
      { basis: "sameVariety", pred: (r) => r.Variety === target.variety },
      {
        basis: "sameSkuSizePack",
        pred: (r) =>
          target.calculatedSku !== null &&
          r.CalculatedSKU === target.calculatedSku &&
          sameNumber(r.MeasurementUnitValue, target.measurementUnitValue) &&
          sameNumber(r.PackQty, target.packQty),
      },
      {
        basis: "sameSkuSize",
        pred: (r) =>
          target.calculatedSku !== null &&
          r.CalculatedSKU === target.calculatedSku &&
          sameNumber(r.MeasurementUnitValue, target.measurementUnitValue),
      },
    ],
    (r) => r.AvgUnitPrice
  );

  return {
    purchaseCost,
    yield: yieldEstimate,
    packing,
    sticker,
    box,
    labourProd,
    labourRepack,
    labourAssembler,
    transport,
    avgUnitPrice,
    transportCostRow,
  };
}

export function hasEstimatedFields(estimates: QuoteCostEstimates | null | undefined): boolean {
  if (!estimates) return false;
  return (Object.keys(ESTIMATE_KEY_BY_OVERRIDE) as string[]).some((k) => {
    const key = ESTIMATE_KEY_BY_OVERRIDE[k];
    if (key === "avgUnitPrice") return false;
    return (estimates[key] as FieldEstimate).source === "estimated";
  });
}
