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
// workbook, built server-side by the Python relay -- decoupled from
// column/filter state so the caller decides what gets exported.
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
