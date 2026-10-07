import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/shared/ui/dialog";
import { getReferenceSchema, type ReferenceTableSchema } from "@/shared/lib/referenceSchemas";
import { parseReferenceUpload } from "@/shared/lib/excelParse";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";
import { formatCurrency } from "@/shared/lib/format";

export async function downloadReferenceTemplate() {
  try {
    const res = await relayFetch("/templates/reference-data");
    if (!res.ok) {
      toast.error("Failed to download the template.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "infinite-herbs-reference-data-template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Failed to reach the server. Try again.");
  }
}

interface PlanRow {
  rowNumber: number;
  data: Record<string, unknown> | null;
  errors: string[];
  action: "create" | "update" | "error";
  previousValue?: number;
}

interface ResultRow {
  rowNumber: number;
  status: "created" | "updated" | "error";
  message?: string;
}

function summarizeRow(schema: ReferenceTableSchema, data: Record<string, unknown> | null): string {
  if (!data) return "—";
  return schema.columns
    .map((c) => {
      const v = data[c.key];
      if (v === undefined || v === null || v === "") return null;
      const display = c.isPercent && typeof v === "number" ? `${(v * 100).toFixed(2)}%` : String(v);
      return `${c.header}: ${display}`;
    })
    .filter((s): s is string => s !== null)
    .join(" · ");
}

function ActionBadge({ action }: { action: PlanRow["action"] }) {
  if (action === "create") return <Badge variant="secondary" className="bg-success/10 text-success">Will create</Badge>;
  if (action === "update") return <Badge variant="secondary">Will update</Badge>;
  return <Badge variant="destructive">Error</Badge>;
}

export function ReferenceBulkUpload({ resourceId, onApplied }: { resourceId: string; onApplied: () => void }) {
  const schema = getReferenceSchema(resourceId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [topLevelError, setTopLevelError] = useState<string | null>(null);

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setIsPreviewing(true);
    setResults(null);
    setTopLevelError(null);
    try {
      // Next.js -> Vite conversion: parsing+structural validation now
      // happens right here in the browser (this same schema's parseRow),
      // not server-side -- only the already-parsed rows go to the relay,
      // which does just the semantic step (does this Variety/Customer/etc.
      // actually exist, create vs. update).
      const buffer = await file.arrayBuffer();
      const parsed = await parseReferenceUpload(buffer, schema);
      if (!parsed.ok) {
        setTopLevelError(parsed.topLevelError ?? "Couldn't read this file.");
        setPlan(null);
        setDialogOpen(true);
        return;
      }
      const res = await relayFetch(`/bulk/${resourceId}/preview`, {
        method: "POST",
        body: JSON.stringify({ parsedRows: parsed.rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTopLevelError(json.detail ?? "Failed to read this file.");
        setPlan(null);
        setDialogOpen(true);
        return;
      }
      setPlan(json.plan);
      setDialogOpen(true);
    } catch {
      setTopLevelError("Failed to reach the server. Try again.");
      setDialogOpen(true);
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!plan) return;
    const rowsToCommit = plan
      .filter((r) => r.action !== "error" && r.data)
      .map((r) => ({ rowNumber: r.rowNumber, data: r.data }));
    if (rowsToCommit.length === 0) {
      toast.error("No valid rows to upload.");
      return;
    }

    setIsCommitting(true);
    try {
      const res = await relayFetch(`/bulk/${resourceId}/commit`, {
        method: "POST",
        body: JSON.stringify({ rows: rowsToCommit }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.detail ?? "Failed to upload.");
        return;
      }
      setResults(json.results);
      const created = (json.results as ResultRow[]).filter((r) => r.status === "created").length;
      const updated = (json.results as ResultRow[]).filter((r) => r.status === "updated").length;
      const errored = (json.results as ResultRow[]).filter((r) => r.status === "error").length;
      toast.success(`${created} created, ${updated} updated${errored > 0 ? `, ${errored} failed` : ""}.`);
      onApplied();
    } catch {
      toast.error("Failed to reach the server. Try again.");
    } finally {
      setIsCommitting(false);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setPlan(null);
    setResults(null);
    setTopLevelError(null);
  }

  const validCount = plan?.filter((r) => r.action !== "error").length ?? 0;
  const createCount = plan?.filter((r) => r.action === "create").length ?? 0;
  const updateCount = plan?.filter((r) => r.action === "update" && !schema.upsertOnly).length ?? 0;
  const errorCount = plan?.filter((r) => r.action === "error").length ?? 0;

  return (
    <div className="flex items-center gap-2">
      <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileSelected} />
      <Button variant="outline" size="sm" onClick={pickFile} disabled={isPreviewing}>
        <Upload className="size-3.5" aria-hidden="true" />
        {isPreviewing ? "Reading…" : "Upload Excel"}
      </Button>
      <button
        type="button"
        onClick={downloadReferenceTemplate}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Need the template?
      </button>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{schema.label} upload</DialogTitle>
            <DialogDescription>
              {results
                ? "Upload complete."
                : topLevelError
                  ? "This file couldn't be read."
                  : `${validCount} valid row${validCount === 1 ? "" : "s"} of ${plan?.length ?? 0} — ${createCount} to create, ${updateCount} to update, ${errorCount} will be skipped.`}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {topLevelError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {topLevelError}
              </div>
            ) : results ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell>
                        {r.status === "error" ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            {r.status === "created" ? "Created" : "Updated"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.message ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : plan && plan.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Summary</TableHead>
                    {schema.upsertOnly && <TableHead>Old → New</TableHead>}
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell className="max-w-96 whitespace-normal text-sm">
                        {summarizeRow(schema, r.data)}
                        {r.errors.length > 0 && (
                          <p className="mt-1 text-xs text-destructive">{r.errors.join(" ")}</p>
                        )}
                      </TableCell>
                      {schema.upsertOnly && (
                        <TableCell className="font-mono text-xs">
                          {formatCurrency(r.previousValue ?? null)} → {formatCurrency((r.data?.rebateValue as number) ?? null)}
                        </TableCell>
                      )}
                      <TableCell>
                        <ActionBadge action={r.action} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No rows found in this file.</p>
            )}
          </div>

          <DialogFooter>
            {results ? (
              <Button onClick={closeDialog}>Done</Button>
            ) : (
              <>
                <DialogClose disabled={isCommitting} onClick={closeDialog}>
                  Cancel
                </DialogClose>
                {!topLevelError && validCount > 0 && (
                  <Button onClick={handleCommit} disabled={isCommitting}>
                    {isCommitting ? "Uploading…" : `Confirm & Upload (${validCount})`}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
