import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/shared/ui/alert-dialog";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import { grossMarginFetch as relayFetch } from "@/shared/lib/ihAgent";

function EditPopover({ row, onSaved }: { row: CommissionRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"percent" | "value">(row.CommissionType);
  const [percentText, setPercentText] = useState(
    row.CommissionPercent !== null ? String(row.CommissionPercent * 100) : ""
  );
  const [valueText, setValueText] = useState(row.CommissionValue !== null ? String(row.CommissionValue) : "");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const text = mode === "percent" ? percentText : valueText;
    const value = Number(text);
    if (text.trim() === "" || Number.isNaN(value)) {
      toast.error(mode === "percent" ? "Enter a commission percentage." : "Enter a commission value.");
      return;
    }

    setIsSaving(true);
    try {
      const body =
        mode === "percent"
          ? { commissionType: "percent", commissionPercent: value / 100 }
          : { commissionType: "value", commissionValue: value };
      const res = await relayFetch(`/commission/${row.Id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.detail ?? "Failed to update commission.");
        return;
      }
      toast.success(`Updated commission for ${row.Customer} / ${row.Variety}.`);
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Failed to reach the server. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Pencil className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-semibold">
          {row.Customer} · {row.Variety}
        </p>
        <div className="flex gap-2 text-xs">
          <button
            className={mode === "percent" ? "font-semibold text-primary" : "text-muted-foreground"}
            onClick={() => setMode("percent")}
          >
            % percent
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            className={mode === "value" ? "font-semibold text-primary" : "text-muted-foreground"}
            onClick={() => setMode("value")}
          >
            $ flat value
          </button>
        </div>
        {mode === "percent" ? (
          <Input
            type="number"
            step="0.01"
            value={percentText}
            onChange={(e) => setPercentText(e.target.value)}
            placeholder="e.g. 10"
          />
        ) : (
          <Input
            type="number"
            step="0.0001"
            value={valueText}
            onChange={(e) => setValueText(e.target.value)}
            placeholder="e.g. 0.15"
          />
        )}
        {row.BaseUnitPrice !== null && (
          <p className="text-xs text-muted-foreground">
            Base price: {formatCurrency(row.BaseUnitPrice)}
          </p>
        )}
        <Button size="sm" onClick={save} disabled={isSaving} className="w-full">
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// Deleting is a full revert, not a soft-delete: the relay's DELETE endpoint
// removes the row from db_ai.CustomerCommission AND immediately re-runs the
// SQL pipeline, so AvgUnitPrice/GrossMargin/CommissionApplied on the
// affected Sales row(s) fall back to their pre-commission values on their
// own -- nothing left over in the database once this completes.
function DeleteButton({ row, onDeleted }: { row: CommissionRow; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      const res = await relayFetch(`/commission/${row.Id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.detail ?? "Failed to delete commission.");
        return;
      }
      toast.success(`Commission removed for ${row.Customer} / ${row.Variety}. Sales prices reverted.`);
      setOpen(false);
      onDeleted();
    } catch {
      toast.error("Failed to reach the server. Try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this commission?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the commission for <strong>{row.Customer}</strong> /{" "}
            <strong>{row.Variety}</strong> and reverts the affected price(s) in Sales Explorer back
            to what they were before it was applied.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>No, keep it</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Yes, delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CommissionLogTable({ rows, onChanged }: { rows: CommissionRow[]; onChanged: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission log</CardTitle>
        <CardDescription>
          Every customer × variety commission currently applied — one row per combination.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No commissions applied yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Variety</TableHead>
                <TableHead className="text-right">Percent</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.Id}>
                  <TableCell>{row.Customer}</TableCell>
                  <TableCell className="max-w-64 whitespace-normal">{row.Variety}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatPercent(row.CommissionPercent)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(row.CommissionValue)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(row.UpdatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <EditPopover row={row} onSaved={onChanged} />
                      <DeleteButton row={row} onDeleted={onChanged} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
