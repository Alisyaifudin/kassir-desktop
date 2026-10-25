import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Show } from "~/components/Show";
import { SkeletonText } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { pageData } from "./data";
import { formatMoney, withUrlBack } from "./format";
import { RegionError } from "./z-Error";

/**
 * The day's three figures, as cards. Each one is a single fact the owner checks
 * on opening: what came in, what went out, what is still owed.
 *
 * **One component gates everything — `<pageData.Gate>` — at the granularity of
 * the thing that waits.** A number inside a static line gets its own gate with
 * `delay={0}` and a placeholder sized to it, so the frame, the words and the `Rp`
 * are on screen from the first frame and only the number pulses. A value that
 * needs two keys (`today` + `yesterday`) declares both; a value that needs one
 * declares one, so it can land first.
 *
 * The **frame** never reads a value: it asks `useFrame` for the group's word and
 * its first error, which is what makes one error treatment per card possible
 * without threading `number | null` props through it.
 *
 * See `.pi/skills/page-data.md` §3 for the rule this file is the example of.
 */
export function Band() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TodayStat
        mode="incoming"
        label="Masuk hari ini"
        icon={ArrowDownLeft}
        tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
      />
      <TodayStat
        mode="outcoming"
        label="Keluar hari ini"
        icon={ArrowUpRight}
        tile="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
      />
      <DebtStat />
    </div>
  );
}

const DEBT_TILE = "bg-destructive/10 text-destructive";

type Mode = "incoming" | "outcoming";

type TodayStatProps = {
  mode: Mode;
  label: string;
  icon: LucideIcon;
  tile: string;
};

function TodayStat({ mode, label, icon, tile }: TodayStatProps) {
  // The frame's two facts, no values: both keys must answer before the card is
  // done, and either failing is one error — not one per value.
  const frame = pageData.useFrame(["today", "yesterday"]);

  return (
    <CardFrame label={label} icon={icon} tile={tile} busy={frame.status === "pending"}>
      <Show
        value={frame.error}
        fallback={
          <>
            <TodayAmount mode={mode} />
            <TodayHint mode={mode} />
          </>
        }
      >
        {(error) => <RegionError title="Gagal memuat ringkasan" error={error} />}
      </Show>
    </CardFrame>
  );
}

/** The amount needs `today` alone: it appears without waiting for the comparison. */
function TodayAmount({ mode }: { mode: Mode }) {
  return (
    <span className="text-normal font-semibold tabular-nums">
      {/* `Rp` is part of the money format, not of the value, so it does not pulse. */}
      Rp{" "}
      <pageData.Gate
        keys={["today"]}
        delay={0}
        pulse={<SkeletonText className="h-[0.7em] w-32" />}
        error={null}
      >
        {({ today }) => today[mode].total.toLocaleString("id-ID")}
      </pageData.Gate>
    </span>
  );
}

/**
 * The count needs `today`; the day-over-day comparison needs both keys. Two
 * gates, so the count can appear while the delta is still on its way.
 */
function TodayHint({ mode }: { mode: Mode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
      <span className="flex items-center gap-1">
        <pageData.Gate
          keys={["today"]}
          delay={0}
          pulse={<SkeletonText className="w-5" />}
          error={null}
        >
          {({ today }) => <span className="tabular-nums">{today[mode].count}</span>}
        </pageData.Gate>
        {/* Whitespace is not a flex item, so this changes nothing on screen;
            it is here so the line copies as "128 transaksi". */}{" "}
        <span>transaksi</span>
      </span>

      <pageData.Gate
        keys={["today", "yesterday"]}
        delay={0}
        error={null}
        pulse={
          <span className="flex items-center gap-1">
            <SkeletonText className="size-4 rounded-full" />
            <SkeletonText className="w-9" />
          </span>
        }
      >
        {({ today, yesterday }) => (
          // `null` here is a reading — answered, no base — and the gate above has
          // already taken "still loading" out of the picture.
          <Show value={delta(today[mode].total, yesterday[mode].total)}>
            {(change) => <Change {...change} />}
          </Show>
        )}
      </pageData.Gate>
    </span>
  );
}

/**
 * The debt card's frame is static — it always leads to `/debt`, like the money
 * card leads to `/money` — so nothing here reads a value for chrome.
 */
function DebtStat() {
  const frame = pageData.useFrame(["debt"]);

  return (
    <CardFrame
      label="Utang berjalan"
      icon={HandCoins}
      tile={DEBT_TILE}
      to={withUrlBack("/debt")}
      busy={frame.status === "pending"}
    >
      <Show
        value={frame.error}
        // Both values come from the same read, so they land together.
        fallback={
          <pageData.Gate
            keys={["debt"]}
            delay={0}
            error={null}
            pulse={
              <>
                <SkeletonText className="h-[0.7em] w-32" />
                <span className="flex items-center gap-1 text-small text-muted-foreground">
                  <SkeletonText className="w-5" /> <span>catatan belum lunas</span>
                </span>
              </>
            }
          >
            {({ debt }) => (
              <>
                <span
                  className={cn(
                    "text-normal font-semibold tabular-nums",
                    debt.total !== 0 && "text-destructive",
                  )}
                >
                  {formatMoney(debt.total)}
                </span>
                <Show
                  when={debt.total !== 0}
                  fallback={
                    <span className="text-small text-muted-foreground">Tidak ada utang</span>
                  }
                >
                  <span className="flex items-center gap-1 text-small text-muted-foreground">
                    <span className="tabular-nums">{debt.count}</span>{" "}
                    <span>catatan belum lunas</span>
                  </span>
                </Show>
              </>
            )}
          </pageData.Gate>
        }
      >
        {(error) => <RegionError title="Gagal memuat utang" error={error} />}
      </Show>
    </CardFrame>
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

/** The comparison chip. Its direction is data, so the arrow is never pinned. */
function Change({ text, up }: Delta) {
  return (
    <span
      aria-label={`${up ? "naik" : "turun"} ${text.replace("+", "")} dari kemarin`}
      className="flex items-center gap-1 tabular-nums"
    >
      {up ? (
        <TrendingUp aria-hidden="true" className="size-4" />
      ) : (
        <TrendingDown aria-hidden="true" className="size-4" />
      )}
      {text}
    </span>
  );
}

const SURFACE = "flex flex-col gap-2 rounded-xl border bg-card p-4";

/**
 * The card's static half: the label and the icon tile, plus the link behaviour
 * when the card leads somewhere. Everything passed as `children` is the values,
 * which may be placeholders — the frame is identical either way, so its height
 * does not move when they arrive.
 */
function CardFrame({
  label,
  icon: Icon,
  tile,
  to,
  busy,
  children,
}: {
  label: string;
  icon: LucideIcon;
  tile: string;
  to?: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-small text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", tile)}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      {children}
    </>
  );

  if (to === undefined) {
    return (
      <div className={SURFACE} aria-busy={busy || undefined}>
        {body}
      </div>
    );
  }

  return (
    <Link
      to={to}
      aria-busy={busy || undefined}
      className={cn(
        SURFACE,
        "transition-colors hover:border-active/50 focus-visible:ring-2 focus-visible:ring-active focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  );
}
