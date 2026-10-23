import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { formatPercent } from "@/shared/lib/format";
import { formatByFieldFormat } from "../model/quoteFields";
import { buildNegotiationHeadroom, type HeadroomResult, type QuoteOverrides, type RecomputeInputs, type SalesRowMode } from "../model/recompute";
import { useQuoteFields } from "../model/useQuoteFields";
import { cn } from "@/shared/lib/utils";
import { THRESHOLD_LABELS } from "@/shared/lib/thresholds";

type RoomZone = "green" | "yellow" | "red";

const ROOM_META: Record<RoomZone, { classes: string }> = {
  green: { classes: "bg-success/10 text-success" },
  yellow: { classes: "bg-warning/10 text-warning" },
  red: { classes: "bg-destructive/10 text-destructive" },
};

function roomZone(r: HeadroomResult): RoomZone {
  if (r.alreadyBelowFloor || r.ceilingAtFloor === null) return "red";
  const roomPct = Math.abs(r.ceilingAtFloor - r.currentValue) / Math.abs(r.currentValue);
  if (roomPct < 0.03) return "red";
  if (roomPct < 0.1) return "yellow";
  return "green";
}

function HeadroomRow({ r }: { r: HeadroomResult }) {
  const { t } = useTranslation();
  const zone = roomZone(r);
  const meta = ROOM_META[zone];
  const Icon = r.direction === 1 ? ArrowUpCircle : ArrowDownCircle;
  const roomPct =
    r.ceilingAtFloor !== null && r.currentValue !== 0 ? Math.abs(r.ceilingAtFloor - r.currentValue) / Math.abs(r.currentValue) : null;

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl border p-3", zone === "red" && "border-destructive/30")}>
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{r.label}</p>
          <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.headroom.now", { value: formatByFieldFormat(r.format, r.currentValue) })}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          {r.alreadyBelowFloor ? (
            <p className="text-sm font-semibold text-destructive">{t("grossMargin.simulator.headroom.belowFloor", { floor: THRESHOLD_LABELS.margin })}</p>
          ) : r.ceilingAtFloor === null ? (
            <p className="text-xs text-muted-foreground">{t("grossMargin.simulator.headroom.noLimit")}</p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                {t(r.direction === 1 ? "grossMargin.simulator.headroom.couldRise" : "grossMargin.simulator.headroom.couldFall", {
                  value: formatByFieldFormat(r.format, r.ceilingAtFloor),
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {roomPct !== null && t("grossMargin.simulator.headroom.roomBefore", { pct: formatPercent(roomPct), floor: THRESHOLD_LABELS.margin })}
              </p>
            </>
          )}
        </div>
        <span className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium", meta.classes)}>{t(`grossMargin.simulator.headroom.zones.${zone}`)}</span>
      </div>
    </div>
  );
}

// Answers "how much room do I have to negotiate this" directly: the real
// $/lb or $ number each lever can concede before breaching the margin floor.
export function QuoteNegotiationHeadroom({
  mode,
  commissionType,
  inputs,
  overrides,
}: {
  mode: SalesRowMode;
  commissionType: "percent" | "value" | null;
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
}) {
  const { t } = useTranslation();
  const fields = useQuoteFields(commissionType, mode);
  const results = useMemo(() => buildNegotiationHeadroom(inputs, overrides, fields), [inputs, overrides, fields]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("grossMargin.simulator.headroom.title")}</CardTitle>
        <CardDescription>{t("grossMargin.simulator.headroom.description", { floor: THRESHOLD_LABELS.margin })}</CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("grossMargin.simulator.headroom.notEnoughData")}</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <HeadroomRow key={r.key} r={r} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
