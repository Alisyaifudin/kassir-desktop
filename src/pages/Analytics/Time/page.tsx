import { Effect, Stream } from "effect";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader, useQuery } from "~/components/Loader";
import { service } from "~/services";
import type { DailyStat, HourStat, WeekdayStat } from "~/services/analytics";
import { bucketise } from "../util-bucket";
import { useRange, type Interval } from "../use-range";
import {
  ChartEmpty,
  ChartFrame,
  COLORS,
  TOOLTIP,
  countTick,
  money,
  useChartGeometry,
} from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

/** When the counter is busy: by hour of day, by weekday, and per period. */
export default function Page() {
  const { from, to, interval } = useRange();
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.all([
          service.analytics.get.hours(from, to),
          service.analytics.get.weekdays(from, to),
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
          <Body
            hours={data[0]}
            weekdays={data[1]}
            daily={data[2]}
            from={from}
            to={to}
            interval={interval}
          />
        )}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

function Body({
  hours,
  weekdays,
  daily,
  from,
  to,
  interval,
}: {
  hours: HourStat[];
  weekdays: WeekdayStat[];
  daily: DailyStat[];
  from: number;
  to: number;
  interval: Interval;
}) {
  const geo = useChartGeometry();
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const row = hours.find((item) => item.hour === hour);
    return { label: String(hour).padStart(2, "0"), count: row?.count ?? 0, omzet: row?.total ?? 0 };
  });
  const byDay = DAYS.map((label, index) => {
    const row = weekdays.find((item) => item.weekday === index + 1);
    return { label, count: row?.count ?? 0, omzet: row?.total ?? 0 };
  });
  const buckets = bucketise(daily, [], from, to, interval);

  const total = hours.reduce((sum, row) => sum + row.count, 0);
  const busiestHour = byHour.reduce(
    (best, row) => (row.count > best.count ? row : best),
    byHour[0]!,
  );
  const busiestDay = byDay.reduce((best, row) => (row.count > best.count ? row : best), byDay[0]!);

  if (total === 0) {
    return (
      <ChartFrame title="Waktu">
        <ChartEmpty>Belum ada penjualan pada periode ini.</ChartEmpty>
      </ChartFrame>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Penjualan" value={`${total.toLocaleString("id-ID")} transaksi`} />
        <Stat
          label="Jam tersibuk"
          value={`${busiestHour.label}.00`}
          hint={`${busiestHour.count} transaksi`}
        />
        <Stat
          label="Hari tersibuk"
          value={busiestDay.label}
          hint={`${busiestDay.count} transaksi`}
        />
      </div>

      <ChartFrame
        title="Jam sibuk"
        hint="Transaksi jual per jam, sepanjang periode"
        label="Grafik transaksi per jam"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} interval={1} minTickGap={24} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={countTick} />
            <Tooltip
              {...TOOLTIP}
              labelFormatter={(label) => `Pukul ${label}.00`}
              formatter={(value) => `${Number(value).toLocaleString("id-ID")} transaksi`}
            />
            <Bar dataKey="count" name="Transaksi" fill={COLORS.omzet} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Pola hari"
        hint="Transaksi jual per hari dalam seminggu"
        label="Grafik transaksi per hari"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={countTick} />
            <Tooltip
              {...TOOLTIP}
              formatter={(value) => `${Number(value).toLocaleString("id-ID")} transaksi`}
            />
            <Bar dataKey="count" name="Transaksi" fill={COLORS.net} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Transaksi per periode"
        hint="Semua transaksi, jual dan beli"
        label="Grafik transaksi per periode"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} minTickGap={28} />
            <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={countTick} />
            <Tooltip
              {...TOOLTIP}
              formatter={(value) => `${Number(value).toLocaleString("id-ID")} transaksi`}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Transaksi"
              stroke={COLORS.omzet}
              fill={COLORS.omzet}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <p className="text-small text-muted-foreground">
        Total omzet pada jam tersibuk: {money(busiestHour.omzet)}.
      </p>
    </div>
  );
}
