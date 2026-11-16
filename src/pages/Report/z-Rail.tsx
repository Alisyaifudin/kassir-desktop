import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "~/lib/utils";
import { useSelected } from "~/hooks/use-selected";
import { roundToFix } from "~/services/record/round";
import type { DayRecord } from "~/services/report";
import { pageData } from "./data";
import { RailRow } from "./z-RailRow";
import { RailSkeleton } from "./z-Loading";
import { ReportErrorFallback } from "./z-Error";

/**
 * The day, as a rail: one row per record, in the order the classifier walks them.
 *
 * A navigation rail and not a table, unlike `/records` — the columns here are
 * three, there is no sorting, no split-payment row spans and no sortable header,
 * so `z-Record/List.tsx`'s 400 lines would be almost all dead weight. What is kept
 * is the shape the operator already knows: the same order, the same money
 * formatting, the same roving tabindex so Tab does not crawl a whole day.
 */

/** The virtualizer's first guess at a row: `py-1.5` twice plus a line box. */
const ROW_HEIGHT = 32;

/** Rows drawn beyond the viewport, so a flick of the wheel is not blank. */
const OVERSCAN = 8;

/**
 * The row template, shared by the column labels and every row so the two cannot
 * drift apart. Five columns (`z-RailRow` explains the dot's own column).
 */
const GRID = "grid grid-cols-[20px_1fr_14px_8px_74px] gap-1 px-1.5 py-1.5 text-sm";

export function Rail() {
  return (
    <pageData.Gate
      keys={["day"]}
      pulse={<RailSkeleton />}
      error={(error) => <ReportErrorFallback error={error} />}
    >
      {({ day }) => <Rows records={day.records} />}
    </pageData.Gate>
  );
}

function Rows({ records }: { records: DayRecord[] }) {
  const [selected, setSelected] = useSelected();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const incoming = useMemo(() => sumOf(records, "incoming"), [records]);
  const outcoming = useMemo(() => sumOf(records, "outcoming"), [records]);

  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => records[index]?.id ?? index,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();
  const first = items[0];
  const last = items[items.length - 1];

  // Until the viewport has a height the virtualizer draws nothing — it cannot say
  // which rows would fit in no space. Rather than an empty rail, draw them all;
  // the first measurement replaces that with a window. Same fallback as
  // `z-Record/List.tsx`, and it is what makes the rail render in a test.
  const windowed = items.length > 0;
  const visible = windowed
    ? items.map((item) => item.index)
    : records.map((_, index) => index);

  const padTop = first === undefined ? 0 : Math.max(0, first.start);
  const padBottom =
    last === undefined ? 0 : Math.max(0, virtualizer.getTotalSize() - last.end);

  const tabStop = useMemo(() => {
    const index = records.findIndex((record) => record.id === selected);
    if (index === -1) return visible[0] ?? 0;
    return visible.includes(index) ? index : (visible[0] ?? 0);
  }, [records, selected, visible]);

  const [focusTarget, setFocusTarget] = useState<number | null>(null);
  useEffect(() => {
    if (focusTarget === null) return;
    const row = scrollRef.current?.querySelector<HTMLElement>(
      `[data-record-index="${focusTarget}"]`,
    );
    if (row === null || row === undefined) return;
    row.focus();
    setFocusTarget(null);
  }, [focusTarget, visible]);

  // A record opened from the URL must not be left below the fold.
  useLayoutEffect(() => {
    if (selected === null) return;
    const index = records.findIndex((record) => record.id === selected);
    if (index !== -1) virtualizer.scrollToIndex(index, { align: "auto" });
  }, [selected, records, virtualizer]);

  const moveFocus = useCallback(
    (index: number) => {
      virtualizer.scrollToIndex(index, { align: "auto" });
      setFocusTarget(index);
    },
    [virtualizer],
  );

  const onKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLDivElement>) => {
      const record = records[index];
      if (record === undefined) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelected(record.id);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const target =
        event.key === "ArrowDown"
          ? index + 1
          : event.key === "ArrowUp"
            ? index - 1
            : event.key === "Home"
              ? 0
              : records.length - 1;
      moveFocus(Math.min(Math.max(target, 0), records.length - 1));
    },
    [records, setSelected, moveFocus],
  );

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            GRID,
            "border-b border-border pb-1 text-xs text-muted-foreground",
          )}
          aria-hidden="true"
        >
          <span>No</span>
          <span>Waktu</span>
          {/* The direction column has no label: 14px cannot hold `Arah`, and
              an arrow glyph there reads as a sort control. */}
          <span />
          <span />
          {/* Right-aligned to the same edge the figures end on. */}
          <span className="text-right">Total</span>
        </div>
        <div ref={scrollRef} className="h-[calc(100%-26px)] overflow-y-auto" role="listbox">
          {padTop > 0 ? <div style={{ height: padTop }} aria-hidden="true" /> : null}
          {visible.map((index) => {
            const record = records[index];
            if (record === undefined) return null;
            return (
              <RailRow
                key={record.id}
                record={record}
                index={index}
                selected={selected === record.id}
                tabStop={index === tabStop}
                onSelect={() => setSelected(record.id)}
                onKeyDown={onKeyDown(index)}
              />
            );
          })}
          {padBottom > 0 ? <div style={{ height: padBottom }} aria-hidden="true" /> : null}
        </div>
      </div>

      {/* Two totals, not one: summing sales and purchases into a single figure is
          a number that means nothing. The footer sums what the rail shows. */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t py-2 text-sm">
        <p className="flex items-center gap-1">
          <span aria-hidden="true">↓</span> Masuk
          <span className="font-semibold">Rp{incoming.toLocaleString("id-ID")}</span>
        </p>
        <p className="flex items-center gap-1">
          <span aria-hidden="true">↑</span> Keluar
          <span className="font-semibold">Rp{outcoming.toLocaleString("id-ID")}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * One direction's total.
 *
 * Summed through `roundToFix` per record and then added, which is what the column
 * shows and therefore what the footer has to add up — not a float sum of raw
 * `grandTotal`s, which can differ from the printed column by a rounding step.
 */
function sumOf(records: DayRecord[], mode: DayRecord["mode"]): number {
  let total = 0;
  for (const record of records) {
    if (record.mode === mode) total += roundToFix(record.grandTotal, record.fix);
  }
  return total;
}
