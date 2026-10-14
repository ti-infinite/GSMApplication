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
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Download, Rows3, Table2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/shared/ui/dropdown-menu";
import { AlarmsCell } from "@/entities/grossMarginSalesRow";
import { grossMarginCellZone, type Zone } from "@/entities/grossMarginSalesRow";
import { formatCurrency, formatPercent, formatNumber } from "@/shared/lib/format";
import type { SalesRow } from "@/entities/grossMarginSalesRow";
import { cn } from "@/shared/lib/utils";
import { useSalesExport } from "./useGrossMarginSalesExport";

type ColKind = "currency" | "percent" | "number" | "flag";

// "core" columns are what Sales Explorer shows by default -- the numbers
// most relevant to margin at a glance. "Full Breakdown" reveals every
// remaining column in db_ai.Sales (21 total) for a full cost-buildup audit.
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
// -- never relies on color alone, the exact percentage is always the
// visible text too.
const MARGIN_CELL_CLASSES: Record<Zone, string> = {
  green: "bg-success/15 text-success",
  yellow: "bg-warning/15 text-warning",
  red: "bg-destructive/15 text-destructive",
  unknown: "border border-border bg-muted text-muted-foreground",
};

const FLAG_LABELS: Record<string, string> = {
  "1": "Unit",
  "0": "Pound",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const TEXT_COLUMNS: { key: keyof SalesRow; label: string; filterLabel: string; core: boolean }[] = [
  { key: "Variety", label: "Variety", filterLabel: "varieties", core: true },
  { key: "Customer", label: "Customer", filterLabel: "customers", core: true },
  { key: "Warehouse", label: "Warehouse", filterLabel: "warehouses", core: true },
  { key: "CalculatedSKU", label: "SKU", filterLabel: "SKUs", core: true },
  { key: "SKUMeasure", label: "SKU (Measure)", filterLabel: "SKUs (measure)", core: false },
];

// The only filters Sales Explorer exposes (2026-10-08, user instruction).
// SKU and the numeric min/max ranges were removed because users weren't
// applying them correctly; the columns themselves are still shown.
const FILTER_COLUMNS = TEXT_COLUMNS.filter((col) =>
  (["Customer", "Variety", "Warehouse"] as (keyof SalesRow)[]).includes(col.key)
);

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

function describeFilters(textFilters: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const { key, label } of FILTER_COLUMNS) {
    const value = textFilters[key];
    if (value) lines.push(`${label} contains "${value}"`);
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

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
      for (const { key } of FILTER_COLUMNS) {
        const filterValue = textFilters[key];
        if (filterValue) {
          const cell = String(row[key] ?? "").toLowerCase();
          if (!cell.includes(filterValue.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [rows, textFilters]);

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
              // No data = genuinely blank, not a "—" placeholder -- there's
              // nothing to flag a zone for when the row has no margin at all.
              if (value === null) return null;
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
                  {value !== null && (
                    <span className="font-mono tabular-nums">{formatCell(value, col.kind)}</span>
                  )}
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
            return value !== null ? (
              <span className="font-mono tabular-nums whitespace-nowrap">{formatCell(value, col.kind)}</span>
            ) : null;
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

  const tableRows = table.getRowModel().rows;

  // Paginated, not virtualized -- consistent with Cost Breakdown, this caps
  // how much the table ever mounts at once (at most 200 rows x however many
  // columns) instead of relying on windowed scroll.
  const pageCount = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const pagedRows = tableRows.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  function toggleFullBreakdown() {
    setIsFullBreakdown((v) => !v);
  }

  async function handleExport() {
    // Export the rows in their current on-screen sort order, not raw
    // filteredRows order, so the workbook matches what's visible.
    const exportRows = table.getRowModel().rows.map((r) => r.original);
    await exportToExcel(exportRows, {
      lines: describeFilters(textFilters),
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
            onClick={toggleFullBreakdown}
          >
            {isFullBreakdown ? <Rows3 aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            {isFullBreakdown ? "Compact view" : "Full Breakdown"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FILTER_COLUMNS.map((col) => (
          <Input
            key={col.key}
            placeholder={`Filter ${col.filterLabel}…`}
            aria-label={`Filter ${col.filterLabel}`}
            value={textFilters[col.key] ?? ""}
            onChange={(e) =>
              setTextFilters((f) => ({ ...f, [col.key]: e.target.value }))
            }
            className="h-8 text-sm"
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredRows.length} of {rows.length} rows
        {isFullBreakdown ? ` · ${columns.length} columns` : ""}
      </p>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <Table scrollContainer={false}>
            <TableHeader className="bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const sortState = header.column.getIsSorted();
                    // The Variety column stays pinned during horizontal
                    // scroll -- Full Breakdown has up to 21 columns.
                    const isFirstColumn = index === 0;
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          header.column.getCanSort() && "cursor-pointer select-none",
                          isFirstColumn && "sticky left-0 z-10 border-r bg-card",
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
              {tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No rows match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((row) => (
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

        {tableRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Rows per page</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {rowsPerPage} <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-20">
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <DropdownMenuItem key={n} onSelect={() => { setRowsPerPage(n); setPage(0); }}>
                      {n}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                {safePage * rowsPerPage + 1}–{Math.min(tableRows.length, (safePage + 1) * rowsPerPage)} / {tableRows.length}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                    aria-label="Previous"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-1 text-muted-foreground">{safePage + 1} / {pageCount}</span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage(safePage + 1)}
                    aria-label="Next"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
