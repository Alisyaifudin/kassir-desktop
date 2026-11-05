import { useMemo } from "react";
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
import type { DailyStat, MarginEstimate, MarginStat } from "~/services/analytics";
import { bucketise } from "../util-bucket";
import { useRange, type Interval } from "../use-range";
import {
  CHART_MARGIN,
  ChartEmpty,
  ChartFrame,
  COLORS,
  RADIUS_BOTTOM,
  RADIUS_TOP,
  TOOLTIP_STYLE,
  chartGeometry,
  money,
  moneyTick,
  moneyTooltip,
} from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";
import { EstimateFields } from "./z-Estimate";
import { useMarginEstimate } from "./use-estimate";

/**
 * Gross margin: what the record stored as cost, where that cost can be believed,
 * and `min(total × percent, raw)` per line where it cannot.
 *
 * The estimate is not a convenience. A year of sales in this shop carries the
 * *selling price* in `record_listings.record_listing_capital` — the v1 app wrote
 * it there and `migration-44` copied the column — so trusting every stored cost
 * made the chart read zero on a normal week and a loss on a discount day.
 * `migration-54` reconstructs what it can from the purchase side; whatever is
 * still missing is the operator's rule, spelled out under the chart, never a
 * silent guess.
 */
export default function Page() {
  const { from, to, interval } = useRange();
  const { estimate, settled, pending, error, change } = useMarginEstimate();
  // `settled`, not `estimate`: a keystroke in the fields must not re-run the
  // margin SQL over every line in the period. See `use-estimate`.
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.all([
          service.analytics.get.margins(from, to, settled),
          service.analytics.get.daily(from, to),
        ]),
      ),
    [from, to, settled.percent, settled.raw],
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
          <Body
            margins={data[0]}
            daily={data[1]}
            from={from}
            to={to}
            interval={interval}
            estimate={estimate}
            pending={pending}
            error={error}
            change={change}
          />
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

/**
 * A loss buckets below zero and reads red, not green — the sign decides the ink.
 * Hoisted out of the JSX on purpose: a `shape` written inline is a new component
 * type on every render, which is the identity churn described in `z-Chart`.
 */
function MarginBar(props: MarginBarProps) {
  const negative = (props.payload?.margin ?? 0) < 0;
  return (
    <Rectangle
      {...props}
      fill={negative ? COLORS.pengeluaran : COLORS.laba}
      radius={negative ? RADIUS_BOTTOM : RADIUS_TOP}
    />
  );
}

function Body({
  margins,
  daily,
  from,
  to,
  interval,
  estimate,
  pending,
  error,
  change,
}: {
  margins: MarginStat[];
  daily: DailyStat[];
  from: number;
  to: number;
  interval: Interval;
  estimate: MarginEstimate;
  pending: boolean;
  error: { message: string } | null | undefined;
  change: (patch: Partial<MarginEstimate>) => void;
}) {
  const geo = chartGeometry;
  // `bucketise` walks every row through Temporal, so it is memoised rather than
  // recomputed on each render — see the note in `z-Chart`.
  const buckets = useMemo(
    () => bucketise(daily, margins, from, to, interval),
    [daily, margins, from, to, interval],
  );
  const costed = margins.reduce((sum, row) => sum + row.costed, 0);
  const estimated = margins.reduce((sum, row) => sum + row.estimated, 0);
  const margin = margins.reduce((sum, row) => sum + row.margin + row.estimatedMargin, 0);
  const omzet = daily
    .filter((row) => row.mode === "incoming")
    .reduce((sum, row) => sum + row.total, 0);
  const ratio = omzet > 0 ? Math.round((margin / omzet) * 100) : null;
  const unit = interval === "day" ? "hari" : interval === "week" ? "minggu" : "bulan";

  const fields = (
    <EstimateFields
      estimate={estimate}
      pending={pending}
      error={error}
      change={change}
    />
  );

  if (costed === 0 && estimated === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Stat label="Laba kotor" value="—" hint="belum ada penjualan pada periode ini" />
        <ChartFrame title="Laba kotor">
          <ChartEmpty>
            Tidak ada penjualan pada periode ini, jadi belum ada laba untuk dihitung.
          </ChartEmpty>
        </ChartFrame>
        {fields}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Laba kotor"
          value={money(margin)}
          hint={`${costed} baris bermodal · ${estimated} baris ditaksir`}
        />
        <Stat
          label="Rasio laba"
          value={ratio === null ? "—" : `${ratio}%`}
          hint="laba kotor ÷ omzet"
        />
        <Stat label="Omzet" value={money(omzet)} hint="pembanding rasio" />
      </div>

      <ChartFrame
        title="Laba kotor"
        hint={`Per ${unit}: modal tercatat + taksiran`}
        label="Grafik laba kotor"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={moneyTick} />
            <Tooltip {...TOOLTIP_STYLE} formatter={moneyTooltip} />
            <Bar dataKey="margin" fill="var(--color-popover-foreground)" name="Laba kotor" shape={MarginBar} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      {fields}

      <p className="text-sm text-muted-foreground">
        Laba dihitung dari harga jual dikurangi modal barang pada baris yang menyimpan modal.
        Baris yang modalnya tidak tercatat — atau tidak lebih rendah dari harga jualnya, tanda
        modal yang salah catat — ditaksir {estimate.percent}% dari total barisnya, paling banyak{" "}
        {money(estimate.raw)} per baris. Jumlah baris yang ditaksir dicetak di atas, dan ubah
        taksirannya di Penaksiran laba.
      </p>
    </div>
  );
}
