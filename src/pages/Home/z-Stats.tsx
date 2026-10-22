import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { formatMoney, withUrlBack } from "./format";
import type { DayFacts } from "./use-day";

/**
 * The day's three numbers, as cards. Each one is a single fact the owner checks
 * on opening: what came in, what went out, what is still owed. The delta is the
 * only comparison on the page and carries no colour — an increase is not
 * automatically good news for either column.
 */
export function Stats({ day }: { day: DayFacts }) {
  const { today, yesterday, debt } = day;
  const settled = debt.total === 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat
        label="Masuk hari ini"
        icon={ArrowDownLeft}
        tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        value={formatMoney(today.incoming.total)}
        hint={`${today.incoming.count} transaksi`}
        delta={delta(today.incoming.total, yesterday.incoming.total)}
      />
      <Stat
        label="Keluar hari ini"
        icon={ArrowUpRight}
        tile="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        value={formatMoney(today.outcoming.total)}
        hint={`${today.outcoming.count} transaksi`}
        delta={delta(today.outcoming.total, yesterday.outcoming.total)}
      />
      <Stat
        label="Utang berjalan"
        icon={HandCoins}
        tile="bg-destructive/10 text-destructive"
        value={formatMoney(debt.total)}
        hint={settled ? "Tidak ada utang" : `${debt.count} catatan belum lunas`}
        tone={settled ? undefined : "text-destructive"}
        to={settled ? undefined : withUrlBack("/debt")}
      />
    </div>
  );
}

type Delta = { text: string; up: boolean };

/** Day-over-day change as a plain percentage, or nothing when there is no base. */
function delta(current: number, previous: number): Delta | null {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { text: "0%", up: true };
  return { text: `${change > 0 ? "+" : ""}${change}%`, up: change > 0 };
}

function Stat({
  label,
  icon: Icon,
  tile,
  value,
  hint,
  tone,
  delta: change,
  to,
}: {
  label: string;
  icon: LucideIcon;
  /** The icon's tint: the only colour a stat card carries. */
  tile: string;
  value: string;
  hint: string;
  tone?: string;
  delta?: Delta | null;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-small text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", tile)}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <span className={cn("text-normal font-semibold tabular-nums", tone)}>{value}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
        <span>{hint}</span>
        {change === null || change === undefined ? null : (
          <span
            aria-label={`${change.up ? "naik" : "turun"} ${change.text.replace("+", "")} dari kemarin`}
            className="flex items-center gap-1 tabular-nums"
          >
            {change.up ? (
              <TrendingUp aria-hidden="true" className="size-4" />
            ) : (
              <TrendingDown aria-hidden="true" className="size-4" />
            )}
            {change.text}
          </span>
        )}
      </span>
    </>
  );

  const surface = "flex flex-col gap-2 rounded-xl border bg-card p-4";

  if (to === undefined) return <div className={surface}>{body}</div>;

  return (
    <Link
      to={to}
      className={cn(
        surface,
        "transition-colors hover:border-active/50 focus-visible:ring-2 focus-visible:ring-active focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  );
}
