import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Field } from "@/shared/ui/field";
import { decimalInputProps, type NumberRule } from "@/shared/lib/formValidation";
import { useFieldValidation } from "@/shared/lib/useFieldValidation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
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
import { formatNumber } from "@/shared/lib/format";

// Shared by all 4 editable reference tables (Yields/CostReference/
// ExtraCost/TransportCost) -- only the identity columns and editable
// fields differ, supplied as config. The "Add a new row" form stays
// per-table (*-card.tsx): the identity pickers differ too much to
// generalize without becoming a leaky abstraction.

export interface ReferenceEditableField {
  key: string;
  label: string;
  /** Entry rules; the same list the resource's "Add" card validates against. */
  rules: NumberRule[];
  format?: (value: number | null) => string;
}

export interface ReferenceIdentityColumn<Row> {
  label: string;
  render: (row: Row) => ReactNode;
}

export interface ReferenceLogTableProps<Row> {
  title: string;
  description: string;
  rows: Row[];
  identityColumns: ReferenceIdentityColumn<Row>[];
  editableFields: ReferenceEditableField[];
  getFieldValue: (row: Row, key: string) => number | null;
  rowId: (row: Row) => number;
  deleteWarning: (row: Row) => string;
  onUpdate: (id: number, values: Record<string, number | null>) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  onChanged: () => void;
  emptyMessage?: string;
  // Plain-text search over the identity columns (e.g. Customer, Variety,
  // Supplier) -- lets you jump straight to the row(s) you're about to edit
  // instead of scrolling a 56-row table looking for them.
  getSearchText: (row: Row) => string;
  searchPlaceholder?: string;
}

// The part of ReferenceLogTableProps that's purely descriptive of one
// entity (labels, which fields are editable, the field-key -> row-property
// mapping, delete-blast-radius copy) -- as opposed to `rows`/`onUpdate`/
// `onDelete`/`onChanged`, which are runtime wiring the consuming tab still
// owns (what data is loaded, how to persist, when to refresh). Each entity
// exports one of these from its own ui/log-table-config.ts.
export type ReferenceLogTableConfig<Row> = Omit<
  ReferenceLogTableProps<Row>,
  "rows" | "onUpdate" | "onDelete" | "onChanged"
>;

function EditPopover<Row>({
  row,
  editableFields,
  getFieldValue,
  rowId,
  onUpdate,
  onSaved,
}: {
  row: Row;
  editableFields: ReferenceEditableField[];
  getFieldValue: (row: Row, key: string) => number | null;
  rowId: (row: Row) => number;
  onUpdate: (id: number, values: Record<string, number | null>) => Promise<unknown>;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of editableFields) {
      const v = getFieldValue(row, f.key);
      initial[f.key] = v === null ? "" : String(v);
    }
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const specs = useMemo(
    () => Object.fromEntries(editableFields.map((f) => [f.key, f.rules])) as Record<string, NumberRule[]>,
    [editableFields]
  );
  const validation = useFieldValidation(texts, specs);

  async function save() {
    if (!validation.attemptSubmit()) return;
    setIsSaving(true);
    try {
      // Parsed values: null only for a blank OPTIONAL field (a blank required
      // field never gets here -- validation blocks it).
      const values: Record<string, number | null> = { ...validation.values };
      await onUpdate(rowId(row), values);
      toast.success(t("grossMargin.common.updated"));
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.common.failedUpdate"));
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
        <div className="space-y-2">
          {editableFields.map((f) => (
            <Field key={f.key} label={f.label} error={validation.visibleErrors[f.key]}>
              <Input
                {...decimalInputProps}
                value={texts[f.key]}
                onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))}
                onBlur={() => validation.touch(f.key)}
                aria-invalid={!!validation.visibleErrors[f.key]}
                placeholder="—"
              />
            </Field>
          ))}
        </div>
        <Button size="sm" onClick={save} disabled={isSaving || !validation.isValid} className="w-full">
          {isSaving ? t("grossMargin.common.saving") : t("grossMargin.common.save")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function DeleteButton<Row>({
  row,
  rowId,
  deleteWarning,
  onDelete,
  onDeleted,
}: {
  row: Row;
  rowId: (row: Row) => number;
  deleteWarning: (row: Row) => string;
  onDelete: (id: number) => Promise<unknown>;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      await onDelete(rowId(row));
      toast.success(t("grossMargin.common.deleted"));
      setOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("grossMargin.common.failedDelete"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("grossMargin.common.deleteRowTitle")}</DialogTitle>
          <DialogDescription>{deleteWarning(row)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>{t("grossMargin.common.keepIt")}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
            {isDeleting ? t("grossMargin.common.deleting") : t("grossMargin.common.yesDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReferenceLogTable<Row>({
  title,
  description,
  rows,
  identityColumns,
  editableFields,
  getFieldValue,
  rowId,
  deleteWarning,
  onUpdate,
  onDelete,
  onChanged,
  emptyMessage,
  getSearchText,
  searchPlaceholder,
}: ReferenceLogTableProps<Row>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => getSearchText(row).toLowerCase().includes(needle));
  }, [rows, search, getSearchText]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}
          {search.trim() && (
            <span className="ml-2 font-normal text-muted-foreground">
              — {t("grossMargin.common.shownOf", { shown: filteredRows.length, total: rows.length })}
            </span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 && (
          <Input
            placeholder={searchPlaceholder ?? t("grossMargin.common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 max-w-xs"
          />
        )}
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage ?? t("grossMargin.common.noRowsYet")}</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("grossMargin.common.noRowsMatch", { search })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {identityColumns.map((c) => (
                  <TableHead key={c.label}>{c.label}</TableHead>
                ))}
                {editableFields.map((f) => (
                  <TableHead key={f.key} className="text-right">
                    {f.label}
                  </TableHead>
                ))}
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={rowId(row)}>
                  {identityColumns.map((c) => (
                    <TableCell key={c.label} className="max-w-64 whitespace-normal">
                      {c.render(row)}
                    </TableCell>
                  ))}
                  {editableFields.map((f) => {
                    const value = getFieldValue(row, f.key);
                    return (
                      <TableCell key={f.key} className="text-right font-mono tabular-nums">
                        {f.format ? f.format(value) : formatNumber(value, 3)}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <EditPopover
                        row={row}
                        editableFields={editableFields}
                        getFieldValue={getFieldValue}
                        rowId={rowId}
                        onUpdate={onUpdate}
                        onSaved={onChanged}
                      />
                      <DeleteButton
                        row={row}
                        rowId={rowId}
                        deleteWarning={deleteWarning}
                        onDelete={onDelete}
                        onDeleted={onChanged}
                      />
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
