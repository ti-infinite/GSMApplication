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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/shared/ui/dialog";
import { formatCurrency, formatPercent } from "@/shared/lib/format";
import { upsertCommission } from "../api/upsertCommission";
import type { CommissionRow } from "@/entities/grossMarginCommission";
import { cn } from "@/shared/lib/utils";

function EditPopover({ row, onSaved }: { row: CommissionRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"percent" | "value">(row.CommissionType);
  const [percentText, setPercentText] = useState(
    row.CommissionType === "percent" ? String(row.CommissionAmount * 100) : ""
  );
  const [valueText, setValueText] = useState(row.CommissionType === "value" ? String(row.CommissionAmount) : "");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const amountText = mode === "percent" ? percentText : valueText;
    const amountNum = Number(amountText);
    if (amountText === "" || Number.isNaN(amountNum) || amountNum < 0) {
      toast.error(mode === "percent" ? "Enter a commission percentage." : "Enter a commission value.");
      return;
    }
    setIsSaving(true);
    try {
      const commissionAmount = mode === "percent" ? amountNum / 100 : amountNum;
      await upsertCommission(row.Customer, mode, commissionAmount);
      toast.success(`Commission updated for ${row.Customer}.`);
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update commission.");
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
        <p className="text-sm font-semibold">{row.Customer}</p>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={cn(mode === "percent" ? "font-semibold text-primary" : "text-muted-foreground")}
            onClick={() => setMode("percent")}
          >
            % percent
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            type="button"
            className={cn(mode === "value" ? "font-semibold text-primary" : "text-muted-foreground")}
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
        <Button size="sm" onClick={save} disabled={isSaving} className="w-full">
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// REWRITE (2026-10-08): "Reset" not "delete" -- nothing is removed from
// db_ms.ClientAttributes, the row always exists once created; this just
// writes it back to 0 (same convention as RebateLogTable's reset button --
// the dashboard never issues a true DELETE against shared ERP data). Keeps
// the row's current CommissionType, zeroes the amount.
function ResetButton({ row, onReset }: { row: CommissionRow; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function confirmReset() {
    setIsResetting(true);
    try {
      await upsertCommission(row.Customer, row.CommissionType, 0);
      toast.success(`Commission reset for ${row.Customer}.`);
      setOpen(false);
      onReset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset commission.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset this commission?</DialogTitle>
          <DialogDescription>
            Reset {row.Customer}&apos;s commission back to 0? This affects their Avg Unit Price across
            every variety they buy.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isResetting}>No, keep it</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirmReset} disabled={isResetting}>
            {isResetting ? "Resetting…" : "Yes, reset to 0"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CommissionLogTable({ rows, onChanged }: { rows: CommissionRow[]; onChanged: () => void }) {
  const active = rows.filter((r) => r.CommissionAmount !== 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission log</CardTitle>
        <CardDescription>Every customer with a non-zero commission currently applied.</CardDescription>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No commissions applied yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((row) => (
                <TableRow key={row.Customer}>
                  <TableCell>{row.Customer}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{row.CommissionType}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.CommissionType === "percent"
                      ? formatPercent(row.CommissionAmount)
                      : formatCurrency(row.CommissionAmount)}
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
