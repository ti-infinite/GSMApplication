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
import { formatCurrency } from "@/shared/lib/format";
import { putRebate } from "../api/putRebate";
import type { RebateRow } from "@/entities/grossMarginRebate";
import { Field } from "@/shared/ui/field";
import { decimalInputProps } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { getFieldRules } from "@/shared/lib/referenceSchemas";

const SPECS = { rebate: getFieldRules("rebate", "rebateValue") };

function EditPopover({ row, onSaved }: { row: RebateRow; onSaved: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(String(row.Rebate));
  const [isSaving, setIsSaving] = useState(false);
  const texts = useMemo(() => ({ rebate: text }), [text]);
  const validation = useFieldValidation(texts, SPECS);

  async function save() {
    if (!validation.attemptSubmit()) return;
    const value = validation.values.rebate as number;
    setIsSaving(true);
    try {
      await putRebate(row.Customer, value);
      toast.success(t("grossMargin.updates.rebate.log.editSuccess", { customer: row.Customer }));
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.updates.rebate.failed"));
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
        <Field label={t("grossMargin.updates.rebate.log.edit")} error={validation.visibleErrors.rebate}>
          <Input
            {...decimalInputProps}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => validation.touch("rebate")}
            aria-invalid={!!validation.visibleErrors.rebate}
            placeholder="e.g. 0.10"
          />
        </Field>
        <Button size="sm" onClick={save} disabled={isSaving || !validation.isValid} className="w-full">
          {isSaving ? t("grossMargin.common.saving") : t("grossMargin.common.save")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// "Reset" not "delete" -- nothing is removed from db_ms.ClientAttributes,
// the row always exists; this just writes it back to $0.00 (the dashboard
// never issues a true DELETE against shared ERP data).
function ResetButton({ row, onReset }: { row: RebateRow; onReset: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function confirmReset() {
    setIsResetting(true);
    try {
      await putRebate(row.Customer, 0);
      toast.success(t("grossMargin.updates.rebate.log.resetSuccess", { customer: row.Customer }));
      setOpen(false);
      onReset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.updates.rebate.log.resetFailed"));
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
          <DialogTitle>{t("grossMargin.updates.rebate.log.resetTitle")}</DialogTitle>
          <DialogDescription>
            {t("grossMargin.updates.rebate.log.resetDescription", { customer: row.Customer })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isResetting}>{t("grossMargin.common.keepIt")}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirmReset} disabled={isResetting}>
            {isResetting ? t("grossMargin.common.resetting") : t("grossMargin.updates.rebate.log.resetConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RebateLogTable({ rows, onChanged }: { rows: RebateRow[]; onChanged: () => void }) {
  const { t } = useTranslation();
  const active = rows.filter((r) => r.Rebate !== 0);

  const columns: TableColumn<RebateRow>[] = [
    { key: "Customer", header: t("grossMargin.common.fields.customer"), sortable: true, render: (row) => row.Customer },
    {
      key: "Rebate",
      header: t("grossMargin.updates.rebate.title"),
      align: "right",
      sortable: true,
      render: (row) => <span className="font-mono tabular-nums">{formatCurrency(row.Rebate)}</span>,
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
        <CardTitle>{t("grossMargin.updates.rebate.log.title")}</CardTitle>
        <CardDescription>{t("grossMargin.updates.rebate.log.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<RebateRow>
          columns={columns}
          data={active}
          rowKey={(row) => row.Customer}
          emptyMessage={t("grossMargin.updates.rebate.log.empty")}
          pageSize={25}
        />
      </CardContent>
    </Card>
  );
}
