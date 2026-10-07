import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
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
import { formatNumber } from "@/shared/lib/format";

// Shared by all 4 editable reference tables (Yields/CostReference/
// ExtraCost/TransportCost) -- the listing + pencil-edit + trash-delete
// shape is identical across them; only the identity columns and the set of
// editable numeric fields differ, both supplied as config. The "Add a new
// row" form is deliberately NOT generic here (see each table's own *-card.tsx)
// -- the identity pickers differ too much per table (free text vs. single
// select vs. two selects vs. a derived-server-side value) to force into one
// shape without becoming a leaky abstraction.

export interface ReferenceEditableField {
  key: string;
  label: string;
  step?: string;
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
// REFACTOR_PLAN.md phase 03.
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

  async function save() {
    setIsSaving(true);
    try {
      const values: Record<string, number | null> = {};
      for (const f of editableFields) {
        const text = texts[f.key];
        values[f.key] = text === "" ? null : Number(text);
      }
      await onUpdate(rowId(row), values);
      toast.success("Updated.");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
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
            <div key={f.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              <Input
                type="number"
                step={f.step ?? "0.01"}
                value={texts[f.key]}
                onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))}
                placeholder="—"
              />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={save} disabled={isSaving} className="w-full">
          {isSaving ? "Saving…" : "Save"}
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
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      await onDelete(rowId(row));
      toast.success("Deleted.");
      setOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
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
          <AlertDialogTitle>Delete this row?</AlertDialogTitle>
          <AlertDialogDescription>{deleteWarning(row)}</AlertDialogDescription>
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
  emptyMessage = "No rows yet.",
  getSearchText,
  searchPlaceholder = "Search…",
}: ReferenceLogTableProps<Row>) {
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
              — {filteredRows.length} of {rows.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length > 0 && (
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 max-w-xs"
          />
        )}
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No rows match &quot;{search}&quot;.
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
