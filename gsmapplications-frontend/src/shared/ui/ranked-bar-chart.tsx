"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatPercent } from "@/shared/lib/format";

export interface RankedBarDatum {
  label: string;
  value: number | null;
  color?: string;
}

// Recharts' built-in tick auto-wrap estimates line breaks from the axis
// `width` using generic font metrics, which for this font/size regularly
// under-measures long variety/customer names -- the wrapped line ends up
// wider than the reserved axis width and its text-anchor="end" origin
// pushes the overflow off the LEFT edge of the chart, clipping the first
// few characters ("BASIL" -> "asil"). Rendering the tick ourselves with an
// explicit char-width budget (and truncating with an ellipsis instead of
// silently overflowing past 2 lines) makes the failure mode "shorter label"
// instead of "corrupted label".
const Y_AXIS_WIDTH = 220;
const TICK_FONT_SIZE = 11;
const TICK_LINE_HEIGHT = TICK_FONT_SIZE + 3;
const AVG_CHAR_WIDTH = TICK_FONT_SIZE * 0.62; // deliberately generous vs. the font's real average

function wrapLabel(label: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = label.split(" ");
  const allLines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate;
    } else {
      allLines.push(current);
      current = word;
    }
  }
  if (current) allLines.push(current);

  if (allLines.length <= maxLines) return allLines;

  const visible = allLines.slice(0, maxLines);
  const last = visible[maxLines - 1];
  visible[maxLines - 1] =
    last.length > maxCharsPerLine - 1 ? `${last.slice(0, maxCharsPerLine - 1)}…` : `${last}…`;
  return visible;
}

function renderYAxisTick(props: { x?: number | string; y?: number | string; payload?: { value?: string | number } }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const label = String(props.payload?.value ?? "");
  const maxCharsPerLine = Math.max(8, Math.floor((Y_AXIS_WIDTH - 10) / AVG_CHAR_WIDTH));
  const lines = wrapLabel(label, maxCharsPerLine, 2);
  const startDy = -((lines.length - 1) * TICK_LINE_HEIGHT) / 2 + TICK_FONT_SIZE / 3;

  return (
    <text x={x} y={y} textAnchor="end" fill="var(--color-foreground)" fontSize={TICK_FONT_SIZE}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? startDy : TICK_LINE_HEIGHT}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

// Horizontal bars (Recharts layout="vertical" = bars extend horizontally,
// category axis runs vertically) -- long variety/customer names read poorly
// as rotated labels under vertical bars (ui-ux-pro-max chart guidance).
// Always sorted by the caller; value labels always visible, not hover-only,
// for the a11y fallback the chart guidance calls for.
export function RankedBarChart({
  data,
  valueType = "currency",
  height,
  barColor = "var(--color-primary)",
}: {
  data: RankedBarDatum[];
  valueType?: "currency" | "percent";
  height?: number;
  barColor?: string;
}) {
  const formatValue = valueType === "percent" ? formatPercent : formatCurrency;
  const rowHeight = 32;
  const chartHeight = height ?? Math.max(120, data.length * rowHeight + 40);

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data for this selection yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 48, bottom: 8, left: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatValue(v)}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={{ stroke: "var(--color-border)" }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={Y_AXIS_WIDTH}
          tick={renderYAxisTick}
          axisLine={{ stroke: "var(--color-border)" }}
          interval={0}
        />
        <Tooltip
          formatter={(value) => formatValue(typeof value === "number" ? value : Number(value))}
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? barColor} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: unknown) => formatValue(typeof v === "number" ? v : Number(v))}
            style={{ fontSize: 11, fill: "var(--color-foreground)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
