import { cn } from "@/shared/lib/utils";

export interface StepLabelProps {
  step: number;
  text: string;
  active: boolean;
}

// Shared by every sequential Quote Simulator picker (Customer depends on
// Variety, Warehouse depends on both) -- numbered steps encode a real
// constraint here, not decoration.
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
