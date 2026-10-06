import { cn } from "@/shared/lib/utils";

export interface StepLabelProps {
  step: number;
  text: string;
  active: boolean;
}

// Shared by every Quote Simulator picker with a genuinely sequential flow
// (Customer options depend on the chosen Variety, Warehouse depends on
// both, etc.) -- numbered steps encode a real constraint there, not
// decoration. Deduped from 3 byte-identical copies (row-picker,
// new-customer-picker, new-variety-picker) -- REFACTOR_PLAN.md phase 01.
export function StepLabel({ step, text, active }: StepLabelProps) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {step}
      </span>
      {text}
    </label>
  );
}
