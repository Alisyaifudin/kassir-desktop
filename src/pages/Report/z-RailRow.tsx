import { cn } from "~/lib/utils";
import { formatTime } from "~/lib/date";
import { roundToFix } from "~/services/record/round";
import type { DayRecord } from "~/services/report";

/**
 * One record in the rail: its number, its direction, its total, and whether
 * anything about it still needs a human.
 *
 * A `●` rather than a word, because the rail is scanned not read — and the same
 * fact is the counter in the header, so the two cannot disagree: both come from
 * `services/report`, both count lines.
 */
export function RailRow({
  record,
  index,
  selected,
  tabStop,
  onSelect,
  onKeyDown,
}: {
  record: DayRecord;
  index: number;
  selected: boolean;
  /** The one row in the tab order — a roving tabindex, as the POS grids use. */
  tabStop: boolean;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const attention = record.unclassified > 0 || record.stale > 0;
  return (
    <div
      role="option"
      aria-selected={selected}
      data-record-index={index}
      tabIndex={tabStop ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "grid cursor-pointer items-center gap-1 px-1.5 py-1.5 text-sm",
        // Five columns: number, time, direction, the attention dot, money. The dot
        // gets one of its own so a record that needs work does not shift its figure
        // a few pixels left of every record that does not — a ragged money column is
        // the one thing that makes a rail unreadable at a glance.
        "grid-cols-[32px_1fr_14px_10px_72px]",
        "text-muted-foreground hover:bg-muted",
        "[&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/50",
        selected && "bg-sky-200 text-foreground font-semibold hover:bg-sky-200 dark:bg-sky-800",
        // A credit keeps its red, selected or not — it is money still owed, and
        // `/records` marks it the same way.
        record.isCredit && "bg-red-300 text-foreground dark:bg-red-700",
      )}
    >
      <span className="tabular-nums">{index + 1}</span>
      <span className="truncate" title={record.cashier}>
        {formatTime(record.date)}
      </span>
      {/* Direction, not mode: the report reads in terms of money in and out, and
          the rail carries both directions, so a tab per direction would slice the
          day in two. Colour, not just the arrow — an arrow alone is a speck at
          12px, and this is the one column that says whether a row is money coming
          in or going out. */}
      <span
        aria-label={record.mode === "incoming" ? "Masuk" : "Keluar"}
        title={record.mode === "incoming" ? "Masuk" : "Keluar"}
        className={cn(
          "text-center text-sm font-bold",
          record.mode === "incoming" ? "text-sky-600" : "text-orange-600",
        )}
      >
        {record.mode === "incoming" ? "↓" : "↑"}
      </span>
      <span
        className="text-center text-[10px] text-amber-600"
        title={
          attention
            ? record.stale > 0
              ? `${record.stale} baris berubah setelah diklasifikasi`
              : `${record.unclassified} baris belum diklasifikasi`
            : undefined
        }
        aria-hidden={!attention}
      >
        {attention ? "●" : ""}
      </span>
      <span className="text-right tabular-nums">
        {roundToFix(record.grandTotal, record.fix).toLocaleString("id-ID")}
      </span>
    </div>
  );
}
