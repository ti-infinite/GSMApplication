import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/shared/ui/dialog'
import type { MenuOption } from '@/shared/lib/menu'
import { getIcon } from '@/shared/lib/menu'

type Props = {
  item:      MenuOption
  collapsed: boolean
}

export default function NewTabDialog({ item, collapsed }: Props) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const Icon = getIcon(item.Icon)

  const base = 'flex items-center rounded-lg transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={collapsed
          ? `${base} w-full justify-center p-2`
          : `${base} w-full gap-3 px-3 py-2 text-sm font-medium`
        }
      >
        <Icon className={collapsed ? 'h-5 w-5 shrink-0' : 'h-4 w-4 shrink-0'} />
        {!collapsed && <span className="flex-1 truncate text-left">{item.Description}</span>}
        {!collapsed && item.IsNew && (
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
            NEW
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{item.Description}</DialogTitle>
            <DialogDescription>{t('newtab.description')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-6 py-4">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                {t('common.cancel')}
              </button>
            </DialogClose>
            <a
              href={item.ExternalRoute ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              {t('common.open')}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}