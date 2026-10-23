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
import { SkeletonText } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { pageData } from "./data";
import { withUrlBack } from "./format";
import { RegionError } from "./z-Error";

/**
 * The day's three figures, as cards. Each one is a single fact the owner checks
 * on opening: what came in, what went out, what is still owed.
 *
 * The card is *not* replaced by a skeleton while its read is in flight. Its
 * label, its icon tile and its wording are static, so they are drawn at once; the
 * three values (`today`'s two, `yesterday`'s delta) are the only things that
 * pulse, in place, at the width they will occupy — the card never changes height.
 *
 * See `.pi/skills/page-data.md` §3 for the rule this file is the example of.
 *
 * `today` and `yesterday` stay separate keys so each value can land on its own:
 * the amount can appear while the comparison beside it is still pulsing, and the
 * debt card is a third read with its own card.
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

function TodayStat({
  mode,
  label,
  icon,
  tile,
}: {
  mode: "incoming" | "outcoming";
  label: string;
  icon: LucideIcon;
  tile: string;
}) {
  const today = pageData.use("today");
  const yesterday = pageData.use("yesterday");

  const error =
    today.type === "error" ? today.error : yesterday.type === "error" ? yesterday.error : null;
  if (error !== null) {
    return (
      <CardFrame label={label} icon={icon} tile={tile}>
        <RegionError title="Gagal memuat ringkasan" error={error} />
      </CardFrame>
    );
  }

  const current = today.type === "success" ? today.data[mode] : null;
  const previous = yesterday.type === "success" ? yesterday.data[mode] : null;

  return (
    <CardFrame
      label={label}
      icon={icon}
      tile={tile}
      busy={current === null || previous === null}
    >
      <Amount value={current === null ? null : current.total} />
      <Hint
        count={current === null ? null : current.count}
        unit="transaksi"
        delta={
          current === null || previous === null
            ? undefined
            : delta(current.total, previous.total)
        }
      />
    </CardFrame>
  );
}

function DebtStat() {
  const res = pageData.use("debt");
  const debt = res.type === "success" ? res.data : null;
  const settled = debt !== null && debt.total === 0;

  if (res.type === "error") {
    return (
      <CardFrame label="Utang berjalan" icon={HandCoins} tile="bg-destructive/10 text-destructive">
        <RegionError title="Gagal memuat utang" error={res.error} />
      </CardFrame>
    );
  }

  return (
    <CardFrame
      label="Utang berjalan"
      icon={HandCoins}
      tile="bg-destructive/10 text-destructive"
      busy={debt === null}
      to={debt !== null && !settled ? withUrlBack("/debt") : undefined}
    >
      <Amount value={debt === null ? null : debt.total} tone={settled ? undefined : "text-destructive"} />
      <Hint
        count={debt === null ? null : debt.count}
        unit="catatan belum lunas"
        // This card has no comparison to draw, in any state.
        delta={null}
        empty={settled ? "Tidak ada utang" : undefined}
      />
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
      <div className={SURFACE} aria-busy={busy === true ? true : undefined}>
        {body}
      </div>
    );
  }

  return (
    <Link
      to={to}
      aria-busy={busy === true ? true : undefined}
      className={cn(
        SURFACE,
        "transition-colors hover:border-active/50 focus-visible:ring-2 focus-visible:ring-active focus-visible:outline-none",
      )}
    >
      {body}
    </Link>
  );
}

/**
 * `Rp` is part of the app's money format, not of the value, so it stays on
 * screen; only the number pulses (at the width a rupiah amount takes here).
 */
function Amount({ value, tone }: { value: number | null; tone?: string }) {
  return (
    <span className={cn("text-normal font-semibold tabular-nums", tone)}>
      Rp{" "}
      {value === null ? (
        <SkeletonText className="h-[0.7em] w-32" />
      ) : (
        value.toLocaleString("id-ID")
      )}
    </span>
  );
}

/**
 * The third line: the count and its noun, then the day-over-day comparison.
 * `undefined` means "not answered yet" and holds both the glyph's slot and the
 * percentage's; `null` means "answered, there is no comparison to draw".
 */
function Hint({
  count,
  unit,
  delta,
  empty,
}: {
  count: number | null;
  unit: string;
  delta?: Delta | null;
  /** Replaces the count line's wording when there is nothing to count. */
  empty?: string;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
      {empty === undefined ? (
        <span className="flex items-center gap-1">
          {count === null ? (
            <SkeletonText className="w-5" />
          ) : (
            <span className="tabular-nums">{count}</span>
          )}
          {/* Whitespace is not a flex item, so this changes nothing on screen;
              it is here so the line copies as "128 transaksi". */}
          {" "}
          <span>{unit}</span>
        </span>
      ) : (
        <span>{empty}</span>
      )}

      {delta === undefined ? (
        <span className="flex items-center gap-1">
          <SkeletonText className="size-4 rounded-full" />
          <SkeletonText className="w-9" />
        </span>
      ) : delta === null ? null : (
        <span
          aria-label={`${delta.up ? "naik" : "turun"} ${delta.text.replace("+", "")} dari kemarin`}
          className="flex items-center gap-1 tabular-nums"
        >
          {delta.up ? (
            <TrendingUp aria-hidden="true" className="size-4" />
          ) : (
            <TrendingDown aria-hidden="true" className="size-4" />
          )}
          {delta.text}
        </span>
      )}
    </span>
  );
}
