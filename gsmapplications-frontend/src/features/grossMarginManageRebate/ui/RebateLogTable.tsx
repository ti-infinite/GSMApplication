import { useState } from "react";
import { toast } from "sonner";
import { Pencil, RotateCcw } from "lucide-react";
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
import { formatCurrency } from "@/shared/lib/format";
import { putRebate } from "../api/putRebate";
import type { RebateRow } from "@/entities/grossMarginRebate";

function EditPopover({ row, onSaved }: { row: RebateRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(String(row.Rebate));
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const value = Number(text);
    if (text === "" || Number.isNaN(value) || value < 0) {
      toast.error("Enter a rebate of $0 or more.");
      return;
    }
    setIsSaving(true);
    try {
      await putRebate(row.Customer, value);
      toast.success(`Rebate updated for ${row.Customer}.`);
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update rebate.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Pencil className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3">
        <p className="text-sm font-semibold">{row.Customer}</p>
        <Input
          type="number"
          step="0.01"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 0.10"
        />
        <Button size="sm" onClick={save} disabled={isSaving} className="w-full">
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// "Reset" not "delete" -- nothing is removed from db_ms.ClientAttributes,
// the row always exists; this just writes it back to $0.00 (see §6b of the
// plan: the dashboard never issues a true DELETE against shared ERP data).
function ResetButton({ row, onReset }: { row: RebateRow; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function confirmReset() {
    setIsResetting(true);
    try {
      await putRebate(row.Customer, 0);
      toast.success(`Rebate reset to $0.00 for ${row.Customer}.`);
      setOpen(false);
      onReset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset rebate.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this rebate?</AlertDialogTitle>
          <AlertDialogDescription>
            Reset {row.Customer}&apos;s rebate back to $0.00? This affects their Avg Unit Price
            across every variety they buy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>No, keep it</AlertDialogCancel>
          <Button variant="destructive" onClick={confirmReset} disabled={isResetting}>
            {isResetting ? "Resetting…" : "Yes, reset to $0.00"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RebateLogTable({ rows, onChanged }: { rows: RebateRow[]; onChanged: () => void }) {
  const active = rows.filter((r) => r.Rebate !== 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rebate log</CardTitle>
        <CardDescription>Every customer with a non-zero rebate currently applied.</CardDescription>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No rebates applied yet — every customer is at $0.00.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Rebate</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((row) => (
                <TableRow key={row.Customer}>
                  <TableCell>{row.Customer}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(row.Rebate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <EditPopover row={row} onSaved={onChanged} />
                      <ResetButton row={row} onReset={onChanged} />
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
