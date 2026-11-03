import type { SavedQuoteRow } from "@/entities/grossMarginSavedQuote";
import type { SkuCatalog } from "@/entities/product";
import { grossMarginFetch, RelayError } from "@/shared/lib/ihAgent";
import { herbNameOf, inferPackaging } from "@/features/grossMarginQuoteSimulator/model/quoteCostEstimates";


const SHEET_COLUMNS: (keyof SavedQuoteRow)[] = [
  "Whs", "Oz", "Pk", "Herb", "Class", "Type", "Packaging", "LaborType", "BoxType", "Client",
  "LbCost", "Yield", "BaseCost", "Waste", "Labor", "ClamBag", "Sticker", "AdPack", "Box", "Transp", "ExtraCosts",
  "Rebate", "Comm", "CommPct", "SuggestedMargin", "SuggestedPrice", "FinalPrice", "DynamicMargin",
  "ClientsPrice", "ClientsMargin", "FobPrice", "ProductPctSales", "LaborPctSales", "PackagingPctSales", "FreightPctSales",
];

export function buildFullExportEntries(quotes: SavedQuoteRow[]) {
  return quotes.map((q) => ({
    values: SHEET_COLUMNS.map((col) => (q[col] as string | number | null | undefined) ?? null),
    grossMargin: q.ClientsMargin,
  }));
}

export interface ClientQuoteRow {
  whs: string | null;
  oz: number | null;
  pk: number | null;
  herb: string | null;
  cls: string | null;
  type: string | null;
  packaging: string | null;
  boxType: string | null;
  client: string | null;
  finalPrice: number | null;
}

const PACKAGING_LABEL: Record<string, string> = {
  CLAMSHELL: "CLAM",
  BAG: "BAG",
  BOX: "BOX",
  TUB: "TUB",
  BUNCH: "BUNCH",
  "POTTED HERBS": "POTTED",
};

export function decodeSalesSku(sku: string | null, catalog: SkuCatalog | null): { cls: string | null; type: string | null } {
  if (!sku || sku.length < 2) return { cls: null, type: null };
  const cls = sku[0].toUpperCase();
  const typeCode = sku[1].toUpperCase();
  let type: string | null = null;
  if (catalog) {
    const typeParam = catalog.parameters.find((p) => `${p.shortName} ${p.descr}`.toUpperCase().includes("TYPE"));
    const attr = typeParam?.paramAttributes.find((a) => a.code.toUpperCase() === typeCode);
    type = (attr?.descr || attr?.shortName || "").toUpperCase() || null;
  }
  return { cls, type: type ?? typeCode };
}

export function buildClientRows(quotes: SavedQuoteRow[], catalog: SkuCatalog | null): ClientQuoteRow[] {
  return quotes.map((q) => {
    const { cls, type } = decodeSalesSku(q.CalculatedSKU, catalog);
    const packaging = q.Packaging ?? (inferPackaging(q.Variety) ? PACKAGING_LABEL[inferPackaging(q.Variety) as string] ?? null : null);
    return {
      whs: q.Whs ?? q.Warehouse,
      oz: q.Oz,
      pk: q.Pk ?? q.PackQuantity,
      herb: q.Herb && !q.Herb.includes(" - ") ? q.Herb : herbNameOf(q.Variety),
      cls: q.Class ?? cls,
      type: q.Type ?? type,
      packaging,
      boxType: q.BoxType,
      client: q.Client ?? q.Customer,
      finalPrice: q.FinalPrice ?? q.ClientsPrice,
    };
  });
}

async function downloadXlsx(path: string, body: unknown, filename: string) {
  const res = await grossMarginFetch(path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    let detail = "Export failed";
    try {
      detail = (await res.json())?.detail ?? detail;
    } catch {
      /* not JSON */
    }
    throw new RelayError(res.status, detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function downloadFullExport(quotes: SavedQuoteRow[]) {
  return downloadXlsx("/export/quote-scenarios", { entries: buildFullExportEntries(quotes) }, `infinite-herbs-saved-quotes-${stamp()}.xlsx`);
}

export function downloadClientExport(quotes: SavedQuoteRow[], catalog: SkuCatalog | null, clientName: string, contactName: string) {
  const safe = clientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "client";
  return downloadXlsx(
    "/export/client-quotes",
    { rows: buildClientRows(quotes, catalog), clientName, contactName: contactName || null },
    `infinite-herbs-proposal-${safe}-${stamp()}.xlsx`
  );
}
