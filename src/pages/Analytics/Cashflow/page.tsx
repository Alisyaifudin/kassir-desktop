import { Effect, Stream } from "effect";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  ChartEmpty,
  ChartFrame,
  COLORS,
  TOOLTIP,
  money,
  moneyTick,
  useChartGeometry,
} from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";

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
  const geo = useChartGeometry();
  const buckets = bucketise(daily, margins, from, to, interval);
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
          <AreaChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={moneyTick} />
            <Tooltip {...TOOLTIP} />
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
          <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={moneyTick} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="net" name="Bersih" radius={[3, 3, 0, 0]}>
              {buckets.map((bucket) => (
                <Cell key={bucket.start} fill={bucket.net < 0 ? COLORS.pengeluaran : COLORS.laba} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
