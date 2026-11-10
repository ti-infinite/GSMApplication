import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { DataTable, type TableColumn } from '@/shared/ui/data-table'
import { Input } from '@/shared/ui/input'
import { ErrorState } from '@/shared/components/ErrorState'
import { useCreditSuppliers, type CreditSupplier } from '@/entities/creditSupplier'
import { DeleteSupplierDialog, ImportFromGsmButton, SupplierFormDialog } from '@/features/creditSupplierDirectory'

// The supplier e-mail directory: who receives the credit notes. Import names from GSM, then
// complete the addresses by hand.
export function CreditSuppliersTable() {
  const { t } = useTranslation()
  const { suppliers, isLoading, error, refetch } = useCreditSuppliers()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<CreditSupplier | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<CreditSupplier | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.emails.some((e) => e.includes(q))) : suppliers
  }, [suppliers, search])

  const columns: TableColumn<CreditSupplier>[] = [
    { key: 'name', header: t('credits.suppliers.name'), sortable: true, render: (s) => <span className="font-medium">{s.name}</span> },
    {
      key: 'emails', header: t('credits.suppliers.emails'),
      render: (s) => s.emails.length === 0
        ? <span className="text-xs text-warning">{t('credits.suppliers.noEmails')}</span>
        : <div className="flex flex-wrap gap-1">{s.emails.map((e) => <span key={e} className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">{e}</span>)}</div>,
    },
    { key: 'notes', header: t('credits.suppliers.notes'), hideMobile: true, render: (s) => <span className="text-muted-foreground">{s.notes ?? '—'}</span> },
    {
      key: 'actions', header: t('credits.common.actions'), align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setEditing(s) }} aria-label={t('credits.common.edit')}><Pencil /></Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDeleting(s) }} aria-label={t('credits.common.delete')}><Trash2 className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('credits.suppliers.search')} className="h-9 pl-8" />
        </div>
        <div className="flex gap-2">
          <ImportFromGsmButton />
          <Button type="button" onClick={() => setEditing(null)}><Plus /> {t('credits.suppliers.add')}</Button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <DataTable columns={columns} data={filtered} rowKey={(s) => String(s.id)} loading={isLoading} pageSize={25} emptyMessage={t('credits.suppliers.empty')} onRowDoubleClick={(s) => setEditing(s)} />
      </div>
      <SupplierFormDialog supplier={editing} onClose={() => setEditing(undefined)} />
      <DeleteSupplierDialog supplier={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
