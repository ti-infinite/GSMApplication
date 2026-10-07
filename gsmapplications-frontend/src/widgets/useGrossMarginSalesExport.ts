import { useState } from "react";
import { toast } from "sonner";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

interface FilterInfo {
  lines: string[];
  filteredCount: number;
  totalCount: number;
}

// Downloads the Sales Explorer's current on-screen rows as an Excel
// workbook. Deliberately decoupled from column definitions/filter state --
// the caller decides which rows and how the active filters are described;
// this hook only knows how to talk to the export endpoint and trigger the
// download. REFACTOR_PLAN.md phase 02: extracted out of sales-table.tsx,
// which tangled this with column, filtering, and alarm logic.
//
// Next.js -> Vite conversion: used to POST to this app's own /api/sales/
// export Next.js route (ExcelJS, server-side). That workbook builder moved
// to the relay (Python/openpyxl, gross-margin-relay/bulk_export.py) -- this
// now calls it directly via the public Caddy proxy, same as every other
// relay call.
export function useSalesExport() {
  const [isExporting, setIsExporting] = useState(false);

  async function exportToExcel(rows: SalesRow[], filterInfo: FilterInfo) {
    setIsExporting(true);
    try {
      const res = await relayFetch("/export/sales", {
        method: "POST",
        body: JSON.stringify({ rows, filterInfo }),
      });
      if (!res.ok) {
        toast.error("Failed to build the export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `infinite-herbs-sales-explorer-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to reach the server. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return { isExporting, exportToExcel };
}
