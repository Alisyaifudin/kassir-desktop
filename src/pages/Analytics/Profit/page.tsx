import { Effect, Stream } from "effect";
import {
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
  ChartEmpty,
  ChartFrame,
  COLORS,
  TOOLTIP,
  money,
  moneyTick,
  chartGeometry,
} from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";

/**
 * Gross margin, computed only from lines whose cost was actually stored. When a
 * period has no such lines the page says so — it never estimates a margin from
 * the selling price (the old analytics page did, and the number was fiction).
 */
export default function Page() {
  const { from, to, interval } = useRange();
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.all([
          service.analytics.get.margins(from, to),
          service.analytics.get.daily(from, to),
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
          <Body margins={data[0]} daily={data[1]} from={from} to={to} interval={interval} />
        )}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

/** A loss bucketed below zero reads red, not green — the sign decides the ink. */
type MarginBarProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number | [number, number, number, number];
  payload?: { margin?: number };
};

function Body({
  margins,
  daily,
  from,
  to,
  interval,
}: {
  margins: MarginStat[];
  daily: DailyStat[];
  from: number;
  to: number;
  interval: Interval;
}) {
  const geo = chartGeometry;
  const buckets = bucketise(daily, margins, from, to, interval);
  const margin = margins.reduce((sum, row) => sum + row.margin, 0);
  const costed = margins.reduce((sum, row) => sum + row.costed, 0);
  const omzet = daily
    .filter((row) => row.mode === "incoming")
    .reduce((sum, row) => sum + row.total, 0);
  const ratio = omzet > 0 ? Math.round((margin / omzet) * 100) : null;
  const unit = interval === "day" ? "hari" : interval === "week" ? "minggu" : "bulan";

  if (costed === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Stat label="Laba kotor" value="—" hint="belum ada baris dengan modal tercatat" />
        <ChartFrame title="Laba kotor">
          <ChartEmpty>
            Modal barang belum tercatat pada periode ini, jadi laba tidak bisa dihitung. Isi modal
            saat mencatat stok atau pembelian.
          </ChartEmpty>
        </ChartFrame>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Laba kotor" value={money(margin)} hint={`${costed} baris bermodal`} />
        <Stat
          label="Rasio laba"
          value={ratio === null ? "—" : `${ratio}%`}
          hint="laba kotor ÷ omzet"
        />
        <Stat label="Omzet" value={money(omzet)} hint="pembanding rasio" />
      </div>

      <ChartFrame
        title="Laba kotor"
        hint={`Per ${unit}, hanya baris yang modalnya tercatat`}
        label="Grafik laba kotor"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={moneyTick} />
            <Tooltip {...TOOLTIP} />
            <Bar
              dataKey="margin"
              name="Laba kotor"
              shape={(props: MarginBarProps) => {
                const negative = (props.payload?.margin ?? 0) < 0;
                return (
                  <Rectangle
                    {...props}
                    fill={negative ? COLORS.pengeluaran : COLORS.laba}
                    radius={negative ? [0, 0, 3, 3] : [3, 3, 0, 0]}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <p className="text-sm text-muted-foreground">
        Laba dihitung dari harga jual dikurangi modal barang pada baris yang menyimpan modal. Baris
        tanpa modal tidak ikut dihitung, dan tidak ditaksir.
      </p>
    </div>
  );
}
