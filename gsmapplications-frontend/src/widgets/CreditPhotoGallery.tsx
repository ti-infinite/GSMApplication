import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { CreditPhoto, PhotoSlot } from '@/entities/credit'

const SLOTS: PhotoSlot[] = ['box_label', 'temperature', 'product']

// Photos grouped by what they show (box label, temperature reading, product), click to enlarge.
// `urlFor` builds the same-origin image URL (credit photos and pre-alert photos differ).
export function CreditPhotoGallery({ photos, urlFor }: { photos: CreditPhoto[]; urlFor: (p: CreditPhoto) => string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<CreditPhoto | null>(null)
  if (photos.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImageOff className="size-4" /> {t('credits.photos.empty')}</p>
  }
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {SLOTS.map((slot) => {
        const list = photos.filter((p) => p.slot === slot)
        return (
          <div key={slot} className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(`credits.photos.${slot}`)} <span className="font-normal">({list.length})</span></p>
            <div className="flex flex-wrap gap-2">
              {list.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              {list.map((p) => (
                <button key={p.id} type="button" onClick={() => setOpen(p)} className="overflow-hidden rounded-lg border border-border transition-transform hover:scale-[1.02]" aria-label={t('credits.photos.open')}>
                  <img src={urlFor(p)} alt={p.filename} loading="lazy" className="size-24 object-cover" />
                </button>
              ))}
            </div>
          </div>
        )
      })}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{open ? t(`credits.photos.${open.slot}`) : ''}</DialogTitle>
          </DialogHeader>
          {open && <img src={urlFor(open)} alt={open.filename} className="max-h-[75vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
