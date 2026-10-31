import { useMemo } from "react";
import { Effect, Stream } from "effect";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader, useQuery } from "~/components/Loader";
import { service } from "~/services";
import type { DailyStat, MarginStat } from "~/services/analytics";
import { bucketise } from "../util-bucket";
import { useRange, type Interval } from "../use-range";
import {
  CHART_MARGIN,
  ChartEmpty,
  ChartFrame,
  COLORS,
  RADIUS_TOP,
  TOOLTIP_STYLE,
  chartGeometry,
  money,
  moneyTooltip,
  moneyTick,
} from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";

/**
 * The net bar's ink follows its sign: a period that spent more than it earned
 * reads red. One `shape` for the whole series rather than a `<Cell>` per bucket —
 * a year plotted by day meant 365 React elements and 365 SVG rects, and the
 * function's identity has to be stable or recharts re-renders them forever (see
 * `z-Chart`).
 */
type NetBarProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number | [number, number, number, number];
  payload?: { net?: number };
};

function NetBar(props: NetBarProps) {
  const negative = (props.payload?.net ?? 0) < 0;
  return <Rectangle {...props} fill={negative ? COLORS.pengeluaran : COLORS.laba} radius={RADIUS_TOP} />;
}

/** What came in, what went out, and the difference between them. */
export default function Page() {
  const { from, to, interval } = useRange();
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.all([
          service.analytics.get.daily(from, to),
          service.analytics.get.margins(from, to),
        ]),
      ),
    [from, to],
  );

  return (
    <AnalyticsErrorBoundary fallback={AnalyticsErrorFallback}>
      <Loader
        res={res}
        fallback={
          <div className="flex flex-col gap-3">
            <SummarySkeleton />
            <ChartSkeleton />
          </div>
        }
      >
        {({ data }) => (
          <Body daily={data[0]} margins={data[1]} from={from} to={to} interval={interval} />
        )}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

function Body({
  daily,
  margins,
  from,
  to,
  interval,
}: {
  daily: DailyStat[];
  margins: MarginStat[];
  from: number;
  to: number;
  interval: Interval;
}) {
  const geo = chartGeometry;
  // Derived once per answer, not once per render: `bucketise` parses a local
  // date per row through Temporal, and a render triggered by a hover would pay
  // for all of them again.
  const buckets = useMemo(
    () => bucketise(daily, margins, from, to, interval),
    [daily, margins, from, to, interval],
  );
  const incoming = daily.filter((row) => row.mode === "incoming");
  const outgoing = daily.filter((row) => row.mode === "outcoming");
  const omzet = incoming.reduce((sum, row) => sum + row.total, 0);
  const pengeluaran = outgoing.reduce((sum, row) => sum + row.total, 0);
  const sold = incoming.reduce((sum, row) => sum + row.count, 0);
  const bought = outgoing.reduce((sum, row) => sum + row.count, 0);
  const net = omzet - pengeluaran;
  const unit = interval === "day" ? "hari" : interval === "week" ? "minggu" : "bulan";

  if (sold === 0 && bought === 0) {
    return (
      <ChartFrame title="Arus kas">
        <ChartEmpty>Belum ada transaksi pada periode ini.</ChartEmpty>
      </ChartFrame>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Omzet" value={money(omzet)} hint={`${sold} transaksi masuk`} />
        <Stat label="Pengeluaran" value={money(pengeluaran)} hint={`${bought} transaksi keluar`} />
        <Stat
          label="Arus kas bersih"
          value={money(net)}
          hint="omzet − pengeluaran"
          tone={net < 0 ? "text-destructive" : undefined}
        />
      </div>

      <ChartFrame
        title="Omzet & pengeluaran"
        hint={`Per ${unit}`}
        label="Grafik omzet dan pengeluaran"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={buckets} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={moneyTick} />
            <Tooltip {...TOOLTIP_STYLE} formatter={moneyTooltip} />
            <Area
              type="monotone"
              dataKey="omzet"
              name="Omzet"
              stroke={COLORS.omzet}
              fill={COLORS.omzet}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="pengeluaran"
              name="Pengeluaran"
              stroke={COLORS.pengeluaran}
              fill={COLORS.pengeluaran}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Arus kas bersih"
        hint="omzet dikurangi pengeluaran"
        label="Grafik arus kas bersih"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={moneyTick} />
            <Tooltip {...TOOLTIP_STYLE} formatter={moneyTooltip} />
            <Bar dataKey="net" name="Bersih" radius={RADIUS_TOP} shape={NetBar} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
