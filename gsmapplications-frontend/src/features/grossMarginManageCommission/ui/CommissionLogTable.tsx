import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { DataTable, type TableColumn } from "@/shared/ui/data-table";
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
import { Field, FieldToggle } from "@/shared/ui/field";
import { decimalInputProps } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

type CommissionMode = "percent" | "value";
const MODE_OPTIONS: { value: CommissionMode; label: string }[] = [
  { value: "percent", label: "%" },
  { value: "value", label: "$" },
];

function EditPopover({ row, onSaved }: { row: CommissionRow; onSaved: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CommissionMode>(row.CommissionType);
  const [amountText, setAmountText] = useState(
    row.CommissionType === "percent" ? String(row.CommissionAmount * 100) : String(row.CommissionAmount)
  );
  const [isSaving, setIsSaving] = useState(false);

  const texts = useMemo(() => ({ amount: amountText }), [amountText]);
  const specs = useMemo(
    () => ({ amount: getFieldRules("commission", mode === "percent" ? "commissionAmountPercent" : "commissionAmountValue") }),
    [mode]
  );
  const validation = useFieldValidation(texts, specs);

  function changeMode(next: CommissionMode) {
    setMode(next);
    setAmountText("");
  }

  async function save() {
    if (!validation.attemptSubmit()) return;
    const amount = validation.values.amount as number;
    setIsSaving(true);
    try {
      const commissionAmount = mode === "percent" ? amount / 100 : amount;
      await upsertCommission(row.Customer, mode, commissionAmount);
      toast.success(t("grossMargin.updates.commission.log.editSuccess", { customer: row.Customer }));
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.updates.commission.failed"));
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
        <Field
          label={t("grossMargin.updates.commission.log.edit")}
          labelEnd={
            <FieldToggle
              value={mode}
              options={MODE_OPTIONS}
              onChange={changeMode}
              ariaLabel={t("grossMargin.updates.commission.typeAria")}
            />
          }
          error={validation.visibleErrors.amount}
        >
          <Input
            {...decimalInputProps}
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            onBlur={() => validation.touch("amount")}
            aria-invalid={!!validation.visibleErrors.amount}
            placeholder={mode === "percent" ? "e.g. 10" : "e.g. 0.15"}
          />
        </Field>
        <Button size="sm" onClick={save} disabled={isSaving || !validation.isValid} className="w-full">
          {isSaving ? t("grossMargin.common.saving") : t("grossMargin.common.save")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}


function ResetButton({ row, onReset }: { row: CommissionRow; onReset: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function confirmReset() {
    setIsResetting(true);
    try {
      await upsertCommission(row.Customer, row.CommissionType, 0);
      toast.success(t("grossMargin.updates.commission.log.resetSuccess", { customer: row.Customer }));
      setOpen(false);
      onReset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.updates.commission.log.resetFailed"));
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
          <DialogTitle>{t("grossMargin.updates.commission.log.resetTitle")}</DialogTitle>
          <DialogDescription>
            {t("grossMargin.updates.commission.log.resetDescription", { customer: row.Customer })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isResetting}>{t("grossMargin.common.keepIt")}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirmReset} disabled={isResetting}>
            {isResetting ? t("grossMargin.common.resetting") : t("grossMargin.updates.commission.log.resetConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CommissionLogTable({ rows, onChanged }: { rows: CommissionRow[]; onChanged: () => void }) {
  const { t } = useTranslation();
  const active = rows.filter((r) => r.CommissionAmount !== 0);

  const columns: TableColumn<CommissionRow>[] = [
    { key: "Customer", header: t("grossMargin.common.fields.customer"), sortable: true, render: (row) => row.Customer },
    {
      key: "CommissionType",
      header: t("grossMargin.common.fields.type"),
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground">
          {row.CommissionType === "percent" ? t("grossMargin.common.percent") : t("grossMargin.common.fixedAmount")}
        </span>
      ),
    },
    {
      key: "CommissionAmount",
      header: t("grossMargin.common.fields.amount"),
      align: "right",
      sortable: true,
      render: (row) => (
        <span className="font-mono tabular-nums">
          {row.CommissionType === "percent" ? formatPercent(row.CommissionAmount) : formatCurrency(row.CommissionAmount)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          <EditPopover row={row} onSaved={onChanged} />
          <ResetButton row={row} onReset={onChanged} />
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.updates.commission.log.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.commission.log.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<CommissionRow>
          columns={columns}
          data={active}
          rowKey={(row) => row.Customer}
          emptyMessage={t("grossMargin.updates.commission.log.empty")}
          pageSize={25}
        />
      </CardContent>
    </Card>
  );
}
