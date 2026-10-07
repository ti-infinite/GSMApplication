import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Rows3, Table2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { AlarmsCell } from "@/entities/grossMarginSalesRow";
import { grossMarginCellZone, type Zone } from "@/entities/grossMarginSalesRow";
import { formatCurrency, formatPercent, formatNumber } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";
import { useSalesExport } from "./useGrossMarginSalesExport";

type ColKind = "currency" | "percent" | "number" | "flag";

function numberFilterFn(min: string, max: string) {
  return (row: SalesRow, key: keyof SalesRow) => {
    const value = row[key] as number | null;
    if (value === null) return false;
    if (min !== "" && value < Number(min)) return false;
    if (max !== "" && value > Number(max)) return false;
    return true;
  };
}

// "core" columns are what Sales Explorer shows by default -- the numbers
// most relevant to margin at a glance. "Full Breakdown" reveals every
// remaining column in db_ai.Sales (21 total), for when someone needs to
// audit the full cost buildup of a specific row, not just the headline
// figures.
const NUMERIC_COLUMNS: { key: keyof SalesRow; label: string; kind: ColKind; core: boolean }[] = [
  { key: "AvgUnitPrice", label: "Avg Unit Price", kind: "currency", core: true },
  { key: "FinalUnitCost", label: "Final Unit Cost", kind: "currency", core: true },
  { key: "CostRatio", label: "Cost Ratio", kind: "percent", core: true },
  { key: "GrossMargin", label: "Gross Margin", kind: "percent", core: true },
  { key: "MeasurementUnitValue", label: "Measurement Unit", kind: "number", core: false },
  { key: "FinalPurPrice", label: "Final Product Price", kind: "currency", core: false },
  { key: "PurchaseCost", label: "Purchase Cost", kind: "currency", core: false },
  { key: "Flag", label: "Source", kind: "flag", core: false },
  { key: "Yield", label: "Yield", kind: "number", core: false },
  { key: "Packing", label: "Packing", kind: "currency", core: false },
  { key: "Sticker", label: "Sticker", kind: "currency", core: false },
  { key: "Box", label: "Box", kind: "currency", core: false },
  { key: "LabourProd", label: "Labour (Prod)", kind: "currency", core: false },
  { key: "LabourRepack", label: "Labour (Repack)", kind: "currency", core: false },
  { key: "LabourAssembler", label: "Labour (Assembler)", kind: "currency", core: false },
  { key: "Transport", label: "Transport", kind: "currency", core: false },
];

// Traffic-light background for the Sales Explorer's Gross Margin cell only
// (2026-07-22, user instruction) -- never relies on color alone, the exact
// percentage is always the visible text (ui-ux-pro-max: color-not-only).
const MARGIN_CELL_CLASSES: Record<Zone, string> = {
  green: "bg-success/15 text-success",
  yellow: "bg-warning/15 text-warning",
  red: "bg-destructive/15 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

const FLAG_LABELS: Record<string, string> = {
  "1": "Unit",
  "0": "Pound",
};

const TEXT_COLUMNS: { key: keyof SalesRow; label: string; core: boolean }[] = [
  { key: "Variety", label: "Variety", core: true },
  { key: "Customer", label: "Customer", core: true },
  { key: "Warehouse", label: "Warehouse", core: true },
  { key: "CalculatedSKU", label: "SKU", core: true },
  { key: "SKUMeasure", label: "SKU (Measure)", core: false },
];

function formatCell(value: number | null, kind: ColKind) {
  if (kind === "flag") {
    if (value === null) return <span className="text-muted-foreground">—</span>;
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {FLAG_LABELS[String(value)] ?? String(value)}
      </span>
    );
  }
  if (kind === "currency") return formatCurrency(value);
  if (kind === "percent") return formatPercent(value);
  return formatNumber(value, value !== null && Number.isInteger(value) ? 0 : 2);
}

function describeFilters(
  textFilters: Record<string, string>,
  numericFilters: Record<string, { min: string; max: string }>
): string[] {
  const lines: string[] = [];
  for (const { key, label } of TEXT_COLUMNS) {
    const value = textFilters[key];
    if (value) lines.push(`${label} contains "${value}"`);
  }
  for (const { key, label, kind } of NUMERIC_COLUMNS) {
    if (kind === "flag") continue;
    const range = numericFilters[key];
    if (!range || (range.min === "" && range.max === "")) continue;
    if (range.min !== "" && range.max !== "") {
      lines.push(`${label} between ${range.min} and ${range.max}`);
    } else if (range.min !== "") {
      lines.push(`${label} ≥ ${range.min}`);
    } else {
      lines.push(`${label} ≤ ${range.max}`);
    }
  }
  return lines;
}

export function SalesTable({ rows }: { rows: SalesRow[] }) {
  const [isFullBreakdown, setIsFullBreakdown] = useState(false);
  const { isExporting, exportToExcel } = useSalesExport();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "AvgUnitPrice", desc: true },
  ]);
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});
  const [numericFilters, setNumericFilters] = useState<Record<string, { min: string; max: string }>>({});

  const visibleTextColumns = useMemo(
    () => (isFullBreakdown ? TEXT_COLUMNS : TEXT_COLUMNS.filter((c) => c.core)),
    [isFullBreakdown]
  );
  const visibleNumericColumns = useMemo(
    () => (isFullBreakdown ? NUMERIC_COLUMNS : NUMERIC_COLUMNS.filter((c) => c.core)),
    [isFullBreakdown]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const { key } of TEXT_COLUMNS) {
        const filterValue = textFilters[key];
        if (filterValue) {
          const cell = String(row[key] ?? "").toLowerCase();
          if (!cell.includes(filterValue.toLowerCase())) return false;
        }
      }
      for (const { key, kind } of NUMERIC_COLUMNS) {
        if (kind === "flag") continue;
        const range = numericFilters[key];
        if (range && (range.min !== "" || range.max !== "")) {
          if (!numberFilterFn(range.min, range.max)(row, key)) return false;
        }
      }
      return true;
    });
  }, [rows, textFilters, numericFilters]);

  const columns = useMemo<ColumnDef<SalesRow>[]>(
    () => [
      ...visibleTextColumns.map(
        (col): ColumnDef<SalesRow> => ({
          id: col.key,
          accessorKey: col.key,
          header: col.label,
          cell: ({ getValue }) =>
            // Variety names run long enough to push Cost Ratio/Gross Margin
            // out of view -- capped and wrapped to keep the row height
            // reasonable while letting the rest of the table stay compact.
            col.key === "Variety" ? (
              <span className="block max-w-[240px] whitespace-normal">{String(getValue() ?? "—")}</span>
            ) : (
              <span className="whitespace-nowrap">{String(getValue() ?? "—")}</span>
            ),
        })
      ),
      ...visibleNumericColumns.map(
        (col): ColumnDef<SalesRow> => ({
          id: col.key,
          accessorKey: col.key,
          header: col.label,
          cell: ({ getValue, row }) => {
            const value = getValue() as number | null;
            if (col.key === "GrossMargin") {
              const zone = grossMarginCellZone(value);
              return (
                <span
                  className={cn(
                    "inline-block w-full rounded-md px-2 py-1 text-center font-mono tabular-nums whitespace-nowrap",
                    MARGIN_CELL_CLASSES[zone]
                  )}
                >
                  {formatPercent(value)}
                </span>
              );
            }
            if (col.key === "AvgUnitPrice") {
              return (
                <div className="whitespace-nowrap">
                  <span className="font-mono tabular-nums">{formatCell(value, col.kind)}</span>
                  {row.original.CommissionApplied === 1 && (
                    <p className="text-[10px] leading-tight text-muted-foreground">Commission applied</p>
                  )}
                  {row.original.IsMixedHerbWholePack === 1 && (
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      Whole-pack total, not per-unit
                    </p>
                  )}
                </div>
              );
            }
            return (
              <span className="font-mono tabular-nums whitespace-nowrap">
                {formatCell(value, col.kind)}
              </span>
            );
          },
        })
      ),
      {
        id: "alarms",
        header: "Alarms",
        enableSorting: false,
        cell: ({ row }) => <AlarmsCell row={row.original} />,
      },
    ],
    [visibleTextColumns, visibleNumericColumns]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  async function handleExport() {
    // Export the rows in their current on-screen sort order, not raw
    // filteredRows order, so the workbook matches what's visible.
    const exportRows = table.getRowModel().rows.map((r) => r.original);
    await exportToExcel(exportRows, {
      lines: describeFilters(textFilters, numericFilters),
      filteredCount: exportRows.length,
      totalCount: rows.length,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sales Explorer</h3>
          <p className="text-xs text-muted-foreground">
            {isFullBreakdown
              ? "Showing every column in db_ai.Sales — the full cost buildup per row."
              : "Showing the headline columns. Switch to Full Breakdown to see every cost component."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download aria-hidden="true" />
            {isExporting ? "Preparing…" : "Export to Excel"}
          </Button>
          <Button
            variant={isFullBreakdown ? "default" : "outline"}
            size="sm"
            onClick={() => setIsFullBreakdown((v) => !v)}
          >
            {isFullBreakdown ? <Rows3 aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            {isFullBreakdown ? "Compact view" : "Full Breakdown"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visibleTextColumns.map((col) => (
          <Input
            key={col.key}
            placeholder={`Filter ${col.label}…`}
            value={textFilters[col.key] ?? ""}
            onChange={(e) =>
              setTextFilters((f) => ({ ...f, [col.key]: e.target.value }))
            }
            className="h-8 text-sm"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visibleNumericColumns
          .filter((col) => col.kind !== "flag")
          .map((col) => (
            <div key={col.key} className="flex items-center gap-1">
              <Input
                placeholder="min"
                type="number"
                value={numericFilters[col.key]?.min ?? ""}
                onChange={(e) =>
                  setNumericFilters((f) => ({
                    ...f,
                    [col.key]: { min: e.target.value, max: f[col.key]?.max ?? "" },
                  }))
                }
                className="h-8 text-sm"
              />
              <span className="text-xs whitespace-nowrap text-muted-foreground">{col.label}</span>
              <Input
                placeholder="max"
                type="number"
                value={numericFilters[col.key]?.max ?? ""}
                onChange={(e) =>
                  setNumericFilters((f) => ({
                    ...f,
                    [col.key]: { min: f[col.key]?.min ?? "", max: e.target.value },
                  }))
                }
                className="h-8 text-sm"
              />
            </div>
          ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredRows.length} of {rows.length} rows
        {isFullBreakdown ? ` · ${columns.length} columns` : ""}
      </p>

      <div className="rounded-lg border">
        {/* Plain native scroll, both axes, not base-ui's ScrollArea --
            base-ui's own horizontal-overflow detection didn't reliably
            pick up this table's real overflow (confirmed: scrollWidth did
            exceed clientWidth, native scrollLeft worked, but base-ui never
            set data-has-overflow-x or rendered its horizontal scrollbar).
            A plain overflow-auto div sidesteps that entirely -- same
            proven sticky-header/sticky-column behavior, always-reliable
            native scrollbar, and trackpad two-finger scroll works
            natively either way. */}
        <div className="h-[600px] overflow-auto">
          <Table scrollContainer={false}>
            <TableHeader className="sticky top-0 z-20 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const sortState = header.column.getIsSorted();
                    // The Variety column (always first, in both Compact and
                    // Full Breakdown) stays pinned during horizontal scroll
                    // too -- z-30 since this one cell is sticky on BOTH axes
                    // at once (the top-left corner), one layer above the
                    // rest of the sticky header row (z-20) and the sticky
                    // column's own body cells (z-10).
                    const isFirstColumn = index === 0;
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          header.column.getCanSort() && "cursor-pointer select-none",
                          isFirstColumn && "sticky left-0 z-30 border-r bg-card",
                          header.column.id === "alarms" && "w-px whitespace-nowrap"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        aria-sort={
                          sortState === "asc"
                            ? "ascending"
                            : sortState === "desc"
                            ? "descending"
                            : "none"
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() &&
                            (sortState === "asc" ? (
                              <ArrowUp className="size-3.5" aria-hidden="true" />
                            ) : sortState === "desc" ? (
                              <ArrowDown className="size-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden="true" />
                            ))}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No rows match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          index === 0 && "sticky left-0 z-10 border-r bg-card",
                          cell.column.id === "alarms" && "w-px whitespace-nowrap"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
