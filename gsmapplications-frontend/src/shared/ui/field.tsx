import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface FieldStep {
  n: number;
  active: boolean;
}

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  /**
   * Right-aligned slot on the label row (segmented toggles, reset icons).
   * Lives on the label row, never under the control, so neighbouring
   * fields in the same grid row keep their controls top-aligned.
   */
  labelEnd?: ReactNode;
  /** Numbered step bubble before the label, for pickers whose fields cascade. */
  step?: FieldStep;
  /** Shown under the control in destructive text; also sets aria-invalid on it. */
  error?: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * The one label + control + error wrapper used across the Gross Margin
 * module. The label row has a fixed minimum height so two fields side by
 * side align whether or not one of them carries a toggle in `labelEnd`.
 */
export function Field({ label, htmlFor, labelEnd, step, error, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {step && (
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold",
                step.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {step.n}
            </span>
          )}
          {label}
        </label>
        {labelEnd}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Small segmented control that fits on a Field's label row.
 */
export function FieldToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-0.5 rounded-md border border-border p-0.5 text-[0.65rem]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded px-1.5 py-0.5 leading-none",
            value === opt.value ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
