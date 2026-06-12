import { Check } from 'lucide-react'

// Duplicated from the productivity wizard so the Products feature is independent.

export interface WizardStep {
  id:    number
  label: string
}

interface WizardStepperProps {
  steps:   WizardStep[]
  current: number
}

export function WizardStepper({ steps, current }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 px-2">
      {steps.map((step, idx) => {
        const done   = step.id < current
        const active = step.id === current

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors
                  ${done   ? 'border-primary bg-primary text-primary-foreground'
                  : active ? 'border-primary bg-background text-primary'
                           : 'border-border bg-background text-muted-foreground'}`}
              >
                {done ? <Check className="h-4 w-4" /> : step.id}
              </div>
              {/* Label: always visible on active/done, hidden on inactive small screens */}
              <span className={`hidden text-xs font-medium sm:block ${
                active ? 'text-primary'
                : done  ? 'text-primary/70'
                        : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`mx-2 mb-4 h-px w-8 transition-colors sm:mx-3 sm:w-20 ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}