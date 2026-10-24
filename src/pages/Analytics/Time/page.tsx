import { useEffect, useState } from "react";
import { Effect, Stream } from "effect";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader, useQuery } from "~/components/Loader";
import { Slider } from "~/components/ui/slider";
import { service } from "~/services";
import type { HourStat, WeekdayStat } from "~/services/analytics";
import { useRange } from "../use-range";
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

const HOUR_KEY = "analytics.hour-window";
/** 08.00–21.00: a shop's day, not the 24-hour axis nothing happens on. */
const DEFAULT_HOURS: HourWindow = [8, 21];

/** `[start, end)` in hours; `24` is midnight, the close of the last hour. */
type HourWindow = [number, number];

function parseHours(value: unknown): HourWindow {
  if (!Array.isArray(value) || value.length !== 2) return DEFAULT_HOURS;
  const [start, end] = value;
  const valid = (hour: unknown) =>
    typeof hour === "number" && Number.isInteger(hour) && hour >= 0 && hour <= 24;
  if (!valid(start) || !valid(end) || start >= end) return DEFAULT_HOURS;
  return [start, end];
}

/**
 * Which hours the "Jam sibuk" histogram covers. The choice is a device
 * preference — it belongs to this machine's screen, not to the report — so it
 * lives in the store and holds across restarts.
 */
function useHourWindow() {
  const [hours, setHours] = useState<HourWindow>(DEFAULT_HOURS);

  useEffect(() => {
    let alive = true;
    void Effect.runPromise(
      service.store
        .get<unknown>(HOUR_KEY)
        .pipe(Effect.match({ onFailure: () => DEFAULT_HOURS, onSuccess: parseHours })),
    ).then((value) => {
      if (alive) setHours(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist on release, not on every step of the drag.
  const save = (next: HourWindow) => {
    void Effect.runPromise(service.store.set(HOUR_KEY, next).pipe(Effect.ignore));
  };

  return { hours, setHours, save } as const;
}

/** When the counter is busy: by hour of day, and by weekday of the week. */
export default function Page() {
  const { from, to } = useRange();
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.all([
          service.analytics.get.hours(from, to),
          service.analytics.get.weekdays(from, to),
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
        {({ data }) => <Body hours={data[0]} weekdays={data[1]} />}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

function Body({ hours, weekdays }: { hours: HourStat[]; weekdays: WeekdayStat[] }) {
  const geo = useChartGeometry();
  const { hours: window, setHours, save } = useHourWindow();
  const [start, end] = window;

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const row = hours.find((item) => item.hour === hour);
    return {
      label: String(hour).padStart(2, "0"),
      count: row?.count ?? 0,
      omzet: row?.total ?? 0,
    };
  });
  const byDay = DAYS.map((label, index) => {
    const row = weekdays.find((item) => item.weekday === index + 1);
    return { label, count: row?.count ?? 0, omzet: row?.total ?? 0 };
  });
  const shown = byHour.slice(start, end);

  const total = hours.reduce((sum, row) => sum + row.count, 0);
  const busiestHour = shown.reduce<{ hour: number; count: number; omzet: number }>(
    (best, row, index) =>
      row.count > best.count ? { hour: start + index, count: row.count, omzet: row.omzet } : best,
    { hour: start, count: 0, omzet: 0 },
  );
  const busiestDay = byDay.reduce((best, row) => (row.count > best.count ? row : best), byDay[0]!);

  if (total === 0) {
    return (
      <ChartFrame title="Waktu">
        <ChartEmpty>Belum ada penjualan pada minggu ini.</ChartEmpty>
      </ChartFrame>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Penjualan" value={`${total.toLocaleString("id-ID")} transaksi`} />
        <Stat
          label="Jam tersibuk"
          value={`${String(busiestHour.hour).padStart(2, "0")}.00`}
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
        hint="Transaksi masuk per jam pada minggu ini"
        label="Grafik transaksi per jam"
        action={
          <div className="flex items-center gap-3">
            <span className="text-small text-muted-foreground tabular-nums">
              {String(start).padStart(2, "0")}.00 &ndash; {String(end).padStart(2, "0")}.00
            </span>
            <Slider
              className="w-[240px] small:w-[180px]"
              min={0}
              max={24}
              step={1}
              minStepsBetweenThumbs={1}
              value={[start, end]}
              thumbLabels={["Jam mulai", "Jam selesai"]}
              onValueChange={(value) => setHours([value[0]!, value[1]!])}
              onValueCommit={(value) => save([value[0]!, value[1]!])}
            />
          </div>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={shown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={geo.tick} interval={0} minTickGap={12} />
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
        hint="Transaksi masuk per hari dalam minggu ini"
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

      <p className="text-small text-muted-foreground">
        Total omzet pada jam tersibuk: {money(busiestHour.omzet)}.
      </p>
    </div>
  );
}
