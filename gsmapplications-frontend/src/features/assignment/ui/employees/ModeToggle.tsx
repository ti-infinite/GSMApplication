import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, User } from 'lucide-react'

type Mode = 'groups' | 'individual'

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px] sm:flex-none ${
        active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
      }`}
    >
      {icon}{label}
    </button>
  )
}

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex w-full rounded-lg border border-border sm:w-auto">
      <ModeBtn active={mode === 'groups'}     onClick={() => onChange('groups')}     icon={<Users className="h-4 w-4" />} label={t('productivity.step2.modeGroups')} />
      <ModeBtn active={mode === 'individual'} onClick={() => onChange('individual')} icon={<User  className="h-4 w-4" />} label={t('productivity.step2.modeIndividual')} />
    </div>
  )
}
