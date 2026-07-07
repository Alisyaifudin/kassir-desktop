import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDate, monthMap } from "~/lib/date";
import type { DataPoint, DeltaFilter } from "./util-bins";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";

const dayNames: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

function tooltipLabel(start: Temporal.PlainDate, end: Temporal.PlainDate): string {
  const days = start.until(end).total("days");
  if (days <= 1) {
    return `${dayNames[start.dayOfWeek]}, ${formatDate(start, "long")}`;
  }
  if (days <= 40) {
    return `${monthMap[start.month]} ${start.year}`;
  }
  return `${start.year}`;
}

function formatTick(tick: number): string {
  if (tick < 1000) return tick.toString();
  if (tick < 1_000_000) return `${(tick / 1000).toString()}K`;
  if (tick < 1_000_000_000) return `${(tick / 1_000_000).toString()}M`;
  return `${(tick / 1_000_000_000).toString()}B`;
}

type ChartDatum = {
  label: string;
  qty: number;
  tooltip: string;
};

type Props = {
  data: DataPoint[];
  delta: DeltaFilter;
};

export function Graph({ data, delta }: Props) {
  const chartData: ChartDatum[] = useMemo(
    () =>
      data.map((d) => ({
        label: d.bin.label,
        qty: d.qty,
        tooltip: tooltipLabel(d.bin.start, d.bin.end),
      })),
    [data],
  );

  const barColor = delta === "positive" ? "#10b981" : "#ef4444";
  const maxQty = Math.max(...data.map((d) => d.qty), 1);

  const ticks = useMemo(() => {
    const result: number[] = [];
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxQty)));
    let interval = magnitude;
    if (maxQty < 2 * magnitude) interval = magnitude / 2;
    else if (maxQty < 5 * magnitude) interval = magnitude;
    else interval = magnitude * 2;

    for (let t = interval; t < maxQty + interval; t += interval) {
      result.push(t);
    }
    return result;
  }, [maxQty]);

  if (data.length === 0 || data.every((d) => d.qty === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Tidak ada data
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#71717a" }}
            interval={chartData.length > 31 ? Math.floor(chartData.length / 12) : 0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#71717a" }}
            tickFormatter={formatTick}
            ticks={ticks}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="qty" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const { tooltip, qty } = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-normal">
      <p className="text-muted-foreground text-small">{tooltip}</p>
      <p className="font-semibold">{qty.toLocaleString("id-ID")}</p>
    </div>
  );
}
