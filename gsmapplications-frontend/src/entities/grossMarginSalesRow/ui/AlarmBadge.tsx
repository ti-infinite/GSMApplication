import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/utils";
import type { AlarmState } from "@/entities/grossMarginSalesRow";
import { formatPercent } from "@/shared/lib/format";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";

const STATE_CONFIG: Record<
  AlarmState,
  { labelKey: string; icon: typeof CheckCircle2; className: string; textClassName: string }
> = {
  ok: {
    labelKey: "grossMargin.alarms.ok",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/30",
    textClassName: "text-success",
  },
  alarm: {
    labelKey: "grossMargin.alarms.alarm",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
    textClassName: "text-destructive",
  },
  unknown: {
    labelKey: "grossMargin.alarms.noData",
    icon: HelpCircle,
    className: "bg-warning/10 text-warning border-warning/30",
    textClassName: "text-warning",
  },
};

// Exact numeric value + threshold behind a single badge, shown on click (not
// just hover) so it works on touch devices too -- the whole point is
// answering "which cost is this, and what's the real percentage?".
export interface AlarmBadgeDetail {
  categoryLabel: string;
  value: number | null;
  threshold: number;
  isFloor: boolean; // true = threshold is a minimum (Gross Margin), false = a maximum
}

// Never relies on color alone: every state renders an icon + text label
// (ui-ux-pro-max: color-not-only). "unknown" is a distinct third state, not
// folded into "ok" -- a missing input must never silently read as fine.
export function AlarmBadge({
  state,
  detail,
  className,
}: {
  state: AlarmState;
  detail?: AlarmBadgeDetail;
  className?: string;
}) {
  const { t } = useTranslation();
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  const label = t(config.labelKey);
  const badgeClassName = cn(
    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
    config.className,
    className
  );

  if (!detail) {
    return (
      <span className={badgeClassName}>
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </span>
    );
  }

  // Only the magnitude is ever shown (via Math.abs below) -- which side of
  // the threshold "over"/"below" means is decided separately by isFloor, so
  // the sign of this subtraction itself doesn't matter.
  const overUnder = detail.value === null ? null : detail.value - detail.threshold;

  return (
    <Popover>
      {/* No asChild -- PopoverTrigger renders its own <button>, so the
          badge styling is applied directly to it. */}
      <PopoverTrigger className={cn(badgeClassName, "cursor-pointer")}>
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm font-semibold">{detail.categoryLabel}</p>
        <p className={cn("mt-1 font-mono text-2xl font-bold tabular-nums", config.textClassName)}>
          {formatPercent(detail.value)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {detail.isFloor
            ? t("grossMargin.alarms.floor", { value: formatPercent(detail.threshold) })
            : t("grossMargin.alarms.threshold", { value: formatPercent(detail.threshold) })}
        </p>
        {overUnder !== null && (
          <p className="mt-1 text-xs font-medium text-destructive">
            {detail.isFloor
              ? t("grossMargin.alarms.belowFloor", { value: formatPercent(Math.abs(overUnder)) })
              : t("grossMargin.alarms.overThreshold", { value: formatPercent(Math.abs(overUnder)) })}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
