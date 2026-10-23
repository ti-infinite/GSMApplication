import Cookies from "js-cookie";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import type { SavedQuoteCreateBody, SavedQuoteRow } from "@/entities/grossMarginSavedQuote";
import type { QuoteOverrides } from "./recompute";
import type { QuoteScenario } from "./quoteScenarios";
import { buildQuoteRowValues, type QuoteScenarioExportEntry } from "./quoteScenarioExport";

const SHEET_COLUMNS = [
  "Whs", "Oz", "Pk", "Herb", "Class", "Type", "Packaging", "LaborType", "BoxType", "Client",
  "LbCost", "Yield", "BaseCost", "Waste", "Labor", "ClamBag", "Sticker", "AdPack", "Box", "Transp",
  "Rebate", "Comm", "CommPct", "SuggestedMargin", "SuggestedPrice", "FinalPrice", "DynamicMargin",
  "ClientsPrice", "ClientsMargin", "FobPrice", "ProductPctSales", "LaborPctSales", "PackagingPctSales", "FreightPctSales",
] as const;

function currentUserName(): string | null {
  const raw = Cookies.get("gsm_user_name");
  return raw ? decodeURIComponent(raw) : null;
}

export function buildSavedQuoteBody(entry: QuoteScenarioExportEntry, baseline: SalesRow): SavedQuoteCreateBody {
  const values = buildQuoteRowValues(entry);
  const sheet = Object.fromEntries(SHEET_COLUMNS.map((col, i) => [col, values[i] ?? null])) as Record<
    (typeof SHEET_COLUMNS)[number],
    string | number | null
  >;
  const text = (v: string | number | null) => (v === null ? null : String(v));
  const num = (v: string | number | null) => (typeof v === "number" ? v : null);
  return {
    QuoteName: entry.name,
    SavedAt: entry.savedAt,
    CreatedBy: currentUserName(),
    CalculatedSKU: baseline.CalculatedSKU,
    SKUMeasure: baseline.SKUMeasure,
    Variety: baseline.Variety,
    Customer: baseline.Customer,
    Warehouse: baseline.Warehouse,
    PackQuantity: entry.packQuantity,
    Mode: entry.mode === "none" ? null : entry.mode,
    OverridesJson: JSON.stringify(entry.overrides),
    Whs: text(sheet.Whs),
    Oz: num(sheet.Oz),
    Pk: num(sheet.Pk),
    Herb: text(sheet.Herb),
    Class: text(sheet.Class),
    Type: text(sheet.Type),
    Packaging: text(sheet.Packaging),
    LaborType: text(sheet.LaborType),
    BoxType: text(sheet.BoxType),
    Client: text(sheet.Client),
    LbCost: num(sheet.LbCost),
    Yield: num(sheet.Yield),
    BaseCost: num(sheet.BaseCost),
    Waste: num(sheet.Waste),
    Labor: num(sheet.Labor),
    ClamBag: num(sheet.ClamBag),
    Sticker: num(sheet.Sticker),
    AdPack: num(sheet.AdPack),
    Box: num(sheet.Box),
    Transp: num(sheet.Transp),
    Rebate: num(sheet.Rebate),
    Comm: num(sheet.Comm),
    CommPct: num(sheet.CommPct),
    SuggestedMargin: num(sheet.SuggestedMargin),
    SuggestedPrice: num(sheet.SuggestedPrice),
    FinalPrice: num(sheet.FinalPrice),
    DynamicMargin: num(sheet.DynamicMargin),
    ClientsPrice: num(sheet.ClientsPrice),
    ClientsMargin: num(sheet.ClientsMargin),
    FobPrice: num(sheet.FobPrice),
    ProductPctSales: num(sheet.ProductPctSales),
    LaborPctSales: num(sheet.LaborPctSales),
    PackagingPctSales: num(sheet.PackagingPctSales),
    FreightPctSales: num(sheet.FreightPctSales),
  };
}

function parseOverrides(json: string | null): QuoteOverrides {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as QuoteOverrides) : {};
  } catch {
    return {};
  }
}

function snapshotFromSavedQuote(q: SavedQuoteRow): SalesRow {
  const packQty = q.PackQuantity && q.PackQuantity > 0 ? q.PackQuantity : 1;
  const avgUnitPrice = q.ClientsPrice !== null ? q.ClientsPrice / packQty : null;
  const grossMargin = q.ClientsMargin;
  const finalUnitCost = avgUnitPrice !== null && grossMargin !== null ? avgUnitPrice * (1 - grossMargin) : null;
  return {
    CalculatedSKU: q.CalculatedSKU ?? `MANUAL-${q.Variety}`,
    SKUMeasure: q.SKUMeasure ?? `MANUAL-${q.Variety}-${q.Oz ?? 0}`,
    Variety: q.Variety,
    Customer: q.Customer,
    Warehouse: q.Warehouse,
    AvgUnitPrice: avgUnitPrice,
    CommissionApplied: q.Comm && q.Comm > 0 ? 1 : 0,
    MeasurementUnitValue: q.Oz,
    PackQty: q.PackQuantity,
    PurchaseCost: q.LbCost,
    Flag: q.Mode === "A" ? 1 : q.Mode === "B" || q.Mode === "C" ? 0 : null,
    Yield: q.Yield,
    FinalPurPrice: q.BaseCost,
    Packing: q.ClamBag,
    Sticker: q.Sticker,
    Box: q.Box,
    LabourProd: q.Labor,
    LabourRepack: null,
    LabourAssembler: null,
    Transport: q.Transp,
    IsMixedHerbWholePack: q.Mode === "C" ? 1 : 0,
    FinalUnitCost: finalUnitCost,
    CostRatio: avgUnitPrice !== null && finalUnitCost !== null && avgUnitPrice !== 0 ? finalUnitCost / avgUnitPrice : null,
    GrossMargin: grossMargin,
  };
}

export function savedQuoteToScenario(q: SavedQuoteRow): QuoteScenario {
  const snapshot = snapshotFromSavedQuote(q);
  return {
    schemaVersion: 2,
    id: `db-${q.Id}`,
    name: q.QuoteName,
    savedAt: q.SavedAt,
    baselineIdentity: {
      calculatedSKU: snapshot.CalculatedSKU,
      skuMeasure: snapshot.SKUMeasure,
      variety: q.Variety,
      customer: q.Customer,
      warehouse: q.Warehouse,
    },
    overrides: parseOverrides(q.OverridesJson),
    baselineSnapshot: snapshot,
    packQuantity: q.PackQuantity ?? undefined,
  };
}

const HANDOFF_KEY = "quoteSimulator:reopenSavedQuote";

export function stashSavedQuoteForSimulator(q: SavedQuoteRow): void {
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(q));
  } catch {
  }
}

export function takeSavedQuoteForSimulator(): SavedQuoteRow | null {
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw) as SavedQuoteRow;
  } catch {
    return null;
  }
}
