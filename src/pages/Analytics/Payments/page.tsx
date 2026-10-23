import { Effect, Stream } from "effect";
import { Link } from "react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Loader, useQuery } from "~/components/Loader";
import { METHOD_NAMES } from "~/lib/constants";
import { service } from "~/services";
import type { DailyStat, PaymentStat } from "~/services/analytics";
import type { DebtRecord } from "~/services/record";
import { useRange } from "../use-range";
import { ChartEmpty, ChartFrame, TOOLTIP, chartColor, money } from "../z-Chart";
import { AnalyticsErrorBoundary, AnalyticsErrorFallback } from "../z-Error";
import { ChartSkeleton, SummarySkeleton } from "../z-Loading";
import { Stat } from "../z-Stat";

/** How the money arrived, and how much of the period is still unpaid. */
export default function Page() {
  const { from, to } = useRange();
  const res = useQuery(
    () =>
      Stream.fromEffect(
        Effect.all([
          service.analytics.get.payments(from, to),
          service.analytics.get.daily(from, to),
          service.record.get.debt(),
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
        {({ data }) => <Body payments={data[0]} daily={data[1]} debt={data[2]} />}
      </Loader>
    </AnalyticsErrorBoundary>
  );
}

function Body({
  payments,
  daily,
  debt,
}: {
  payments: PaymentStat[];
  daily: DailyStat[];
  debt: DebtRecord[];
}) {
  const incoming = daily.filter((row) => row.mode === "incoming");
  const omzet = incoming.reduce((sum, row) => sum + row.total, 0);
  const unpaid = incoming.reduce((sum, row) => sum + row.unpaid, 0);
  const paid = omzet - unpaid;
  const received = payments.reduce((sum, row) => sum + row.total, 0);
  const outstanding = debt.reduce((sum, row) => sum + row.total, 0);
  const paidShare = omzet > 0 ? Math.round((paid / omzet) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Diterima" value={money(received)} hint="dari semua metode" />
        <Stat label="Lunas" value={money(paid)} hint={`${paidShare}% dari omzet`} />
        <Stat
          label="Kredit"
          value={money(unpaid)}
          hint={unpaid > 0 ? "belum dibayar pada periode ini" : "tidak ada kredit"}
          tone={unpaid > 0 ? "text-destructive" : undefined}
        />
        <Stat
          label="Utang berjalan"
          value={money(outstanding)}
          hint={`${debt.length} catatan · semua waktu`}
          tone={outstanding > 0 ? "text-destructive" : undefined}
        />
      </div>

      {payments.length === 0 ? (
        <ChartFrame title="Komposisi pembayaran">
          <ChartEmpty>Belum ada pembayaran pada periode ini.</ChartEmpty>
        </ChartFrame>
      ) : (
        <ChartFrame
          title="Komposisi pembayaran"
          hint="Uang yang benar-benar diterima, per jenis metode"
          label="Grafik komposisi pembayaran"
        >
          <div className="flex h-full items-center gap-4">
            <div className="h-full min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...TOOLTIP} />
                  <Pie
                    data={payments}
                    dataKey="total"
                    nameKey="kind"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                  >
                    {payments.map((row, index) => (
                      <Cell key={row.kind} fill={chartColor(index)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex w-[380px] shrink-0 flex-col gap-1">
              {payments.map((row, index) => (
                <li key={row.kind} className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: chartColor(index) }}
                    />
                    <span className="min-w-0 truncate">{METHOD_NAMES[row.kind]}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="text-small tabular-nums text-muted-foreground">
                      {row.count}×
                    </span>
                    <span className="font-semibold tabular-nums">{money(row.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ChartFrame>
      )}

      <section className="flex flex-col gap-2 rounded-xl border bg-card p-3">
        <h2 className="text-small font-semibold">Lunas vs kredit</h2>
        <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${paidShare}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-small">
          <span className="text-muted-foreground">
            Lunas {money(paid)} ({paidShare}%)
          </span>
          <span className={unpaid > 0 ? "text-destructive" : "text-muted-foreground"}>
            Kredit {money(unpaid)} ({omzet > 0 ? 100 - paidShare : 0}%)
          </span>
        </div>
        {outstanding > 0 ? (
          <Link
            to="/debt?url_back=/analytics/pembayaran"
            className="text-small text-muted-foreground underline-offset-4 hover:text-active hover:underline"
          >
            Lihat {debt.length} catatan utang berjalan →
          </Link>
        ) : null}
      </section>
    </div>
  );
}
