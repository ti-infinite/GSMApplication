import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

export async function downloadReferenceTemplate(t: TFunction) {
  try {
    const res = await relayFetch("/templates/reference-data");
    if (!res.ok) {
      toast.error(t("grossMargin.updates.bulk.templateFailed"));
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
    toast.error(t("grossMargin.common.serverUnreachable"));
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
  const { t } = useTranslation();
  if (action === "create") return <Badge variant="secondary" className="bg-success/10 text-success">{t("grossMargin.updates.bulk.willCreate")}</Badge>;
  if (action === "update") return <Badge variant="secondary">{t("grossMargin.updates.bulk.willUpdate")}</Badge>;
  return <Badge variant="destructive">{t("grossMargin.updates.bulk.error")}</Badge>;
}

export function ReferenceBulkUpload({ resourceId, onApplied }: { resourceId: string; onApplied: () => void }) {
  const { t } = useTranslation();
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
      // Parsing + structural validation happens here in the browser (this
      // schema's parseRow) -- only the already-parsed rows go to the relay,
      // which does just the semantic step (does this Variety/Customer/etc.
      // actually exist, create vs. update).
      const buffer = await file.arrayBuffer();
      const parsed = await parseReferenceUpload(buffer, schema);
      if (!parsed.ok) {
        setTopLevelError(parsed.topLevelError ?? t("grossMargin.updates.bulk.unreadable"));
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
        setTopLevelError(json.detail ?? t("grossMargin.updates.bulk.readFailed"));
        setPlan(null);
        setDialogOpen(true);
        return;
      }
      setPlan(json.plan);
      setDialogOpen(true);
    } catch {
      setTopLevelError(t("grossMargin.common.serverUnreachable"));
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
      toast.error(t("grossMargin.updates.bulk.noValidRows"));
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
        toast.error(json.detail ?? t("grossMargin.updates.bulk.uploadFailed"));
        return;
      }
      setResults(json.results);
      const created = (json.results as ResultRow[]).filter((r) => r.status === "created").length;
      const updated = (json.results as ResultRow[]).filter((r) => r.status === "updated").length;
      const errored = (json.results as ResultRow[]).filter((r) => r.status === "error").length;
      toast.success(
        errored > 0
          ? t("grossMargin.updates.bulk.commitSuccessWithErrors", { created, updated, errored })
          : t("grossMargin.updates.bulk.commitSuccess", { created, updated })
      );
      onApplied();
    } catch {
      toast.error(t("grossMargin.common.serverUnreachable"));
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
        {isPreviewing ? t("grossMargin.updates.bulk.reading") : t("grossMargin.updates.bulk.uploadExcel")}
      </Button>
      <button
        type="button"
        onClick={() => downloadReferenceTemplate(t)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {t("grossMargin.updates.bulk.needTemplate")}
      </button>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("grossMargin.updates.bulk.dialogTitle", { label: schema.label })}</DialogTitle>
            <DialogDescription>
              {results
                ? t("grossMargin.updates.bulk.complete")
                : topLevelError
                  ? t("grossMargin.updates.bulk.unreadable")
                  : t("grossMargin.updates.bulk.summary", {
                      valid: validCount,
                      total: plan?.length ?? 0,
                      create: createCount,
                      update: updateCount,
                      errors: errorCount,
                    })}
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
                    <TableHead>{t("grossMargin.updates.bulk.row")}</TableHead>
                    <TableHead>{t("grossMargin.updates.bulk.result")}</TableHead>
                    <TableHead>{t("grossMargin.updates.bulk.detail")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell>
                        {r.status === "error" ? (
                          <Badge variant="destructive">{t("grossMargin.updates.bulk.failed")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            {r.status === "created" ? t("grossMargin.updates.bulk.created") : t("grossMargin.updates.bulk.updated")}
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
                    <TableHead>{t("grossMargin.updates.bulk.row")}</TableHead>
                    <TableHead>{t("grossMargin.updates.bulk.rowSummary")}</TableHead>
                    {schema.upsertOnly && <TableHead>{t("grossMargin.updates.bulk.oldNew")}</TableHead>}
                    <TableHead>{t("grossMargin.updates.bulk.action")}</TableHead>
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
              <p className="py-8 text-center text-sm text-muted-foreground">{t("grossMargin.updates.bulk.noRows")}</p>
            )}
          </div>

          <DialogFooter>
            {results ? (
              <Button onClick={closeDialog}>{t("grossMargin.common.done")}</Button>
            ) : (
              <>
                <DialogClose disabled={isCommitting} onClick={closeDialog}>
                  {t("grossMargin.common.cancel")}
                </DialogClose>
                {!topLevelError && validCount > 0 && (
                  <Button onClick={handleCommit} disabled={isCommitting}>
                    {isCommitting ? t("grossMargin.updates.bulk.uploading") : t("grossMargin.updates.bulk.confirmUpload", { count: validCount })}
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
