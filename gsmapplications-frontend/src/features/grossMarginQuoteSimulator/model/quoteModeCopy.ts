import { PackageCheck, Wheat, Layers, HelpCircle } from "lucide-react";
import type { SalesRowMode } from "./recompute";

// Plain-language labels lead -- "Mode A/B/C" is internal pipeline
// terminology a user shouldn't need to remember. `plain` is the primary
// user-facing label; `technical` is kept only as a title-tooltip for
// anyone cross-referencing the SQL pipeline directly.
export const MODE_COPY: Record<
  SalesRowMode,
  { plain: string; description: string; technical: string; icon: typeof PackageCheck; theme: "primary" | "chart-3" | "chart-5" | "destructive" }
> = {
  A: {
    plain: "Bought pre-packaged",
    description: "The supplier already packaged this — we only repack it.",
    technical: "Mode A",
    icon: PackageCheck,
    theme: "chart-3",
  },
  B: {
    plain: "Bought raw, by the pound",
    description: "We buy it loose and do all the packaging/production ourselves.",
    technical: "Mode B",
    icon: Wheat,
    theme: "chart-5",
  },
  C: {
    plain: "Mixed-herb blend",
    description: "A combination of several herbs — every number is a whole-pack total, not per-unit.",
    technical: "Mode C",
    icon: Layers,
    theme: "primary",
  },
  none: {
    plain: "No cost data yet",
    description: "No purchase match for this row — add a Cost Reference/Yield on the Updates tab first.",
    technical: "No mode",
    icon: HelpCircle,
    theme: "destructive",
  },
};
