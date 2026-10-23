import { PackageCheck, Wheat, Layers, HelpCircle } from "lucide-react";
import type { SalesRowMode } from "./recompute";

// Plain-language labels lead -- "Mode A/B/C" is internal pipeline
// terminology a user shouldn't need to remember. The user-facing text lives
// in i18n under grossMargin.simulator.modes.<mode>.{plain,description};
// `technical` is kept only for anyone cross-referencing the SQL pipeline.
export const MODE_COPY: Record<
  SalesRowMode,
  { technical: string; icon: typeof PackageCheck; theme: "primary" | "chart-3" | "chart-5" | "destructive" }
> = {
  A: { technical: "Mode A", icon: PackageCheck, theme: "chart-3" },
  B: { technical: "Mode B", icon: Wheat, theme: "chart-5" },
  C: { technical: "Mode C", icon: Layers, theme: "primary" },
  none: { technical: "No mode", icon: HelpCircle, theme: "destructive" },
};
