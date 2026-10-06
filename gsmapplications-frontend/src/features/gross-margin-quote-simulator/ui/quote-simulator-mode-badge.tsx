"use client";

import { Badge } from "@/shared/ui/badge";
import type { SalesRowMode } from "../model/recompute";
import { MODE_COPY } from "../model/quote-mode-copy";
import { cn } from "@/shared/lib/utils";

const THEME_CLASSES: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  "chart-3": "bg-[var(--chart-3)]/10 text-[var(--chart-3)] border-[var(--chart-3)]/20",
  "chart-5": "bg-[var(--chart-5)]/10 text-[var(--chart-5)] border-[var(--chart-5)]/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

export function QuoteSimulatorModeBadge({ mode }: { mode: SalesRowMode }) {
  const copy = MODE_COPY[mode];
  const Icon = copy.icon;
  return (
    <Badge
      variant="outline"
      title={`${copy.technical}: ${copy.description}`}
      className={cn("gap-1.5 font-medium", THEME_CLASSES[copy.theme])}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {copy.plain}
    </Badge>
  );
}
