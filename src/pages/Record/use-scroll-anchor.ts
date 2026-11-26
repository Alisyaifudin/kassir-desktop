import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";
import { nearestRow, type AnchorRow } from "./anchor";

/** How long the list has to stand still before its place is written. */
const SAVE_DELAY_MS = 150;

/**
 * The few virtualizer members this needs. Structural on purpose: the hook reads
 * and writes a window, so a test can hand it three rows and a fake list instead
 * of a measured browser element.
 */
type VirtualWindow = {
  getVirtualItems: () => readonly { index: number; start: number; end: number }[];
  scrollToIndex: (
    index: number,
    options?: { align?: "auto" | "start" | "center" | "end" },
  ) => void;
};

type Pending = {
  /** The view the position was read in — not the one it is written from. */
  day: number;
  slot: string;
  value: number;
};

/**
 * Keeps the place a virtualized list was left at, as **a value rather than a pixel
 * offset**: the sort value of the first row that is on screen *whole* (`time` or
 * `total`; see `anchor.ts` for how a value comes back as a row).
 *
 * That is what makes the position survive changes the pixels cannot: the same day
 * reopened after the list refetched, or narrowed by a filter, lands on the record
 * that was on top instead of on whatever now happens to sit at that offset. It is
 * also what makes it cheap to store — one number per order — and what makes it
 * go stale honestly: a value belongs to a day and to an order, and is ignored
 * when either has moved on.
 *
 * The two halves:
 *
 * - **Restore** — whenever the visible rows change (first render, another day,
 *   another order, a filter, a refetch), put the remembered row back under the top
 *   edge. With no position stored yet, the open record is revealed, else the list
 *   starts at the top; a slot that has never been scrolled is therefore not left
 *   wherever the previous order happened to leave the scrollbar.
 * - **Save** — when scrolling stops, write the value of the row that is on top.
 *
 * Deliberately keyed on the row *set*, not on scroll events alone: a list that is
 * only re-applied while the operator scrolls would keep the old offset when the
 * rows underneath it change.
 */
export function useScrollAnchor({
  container,
  slot,
  day,
  rows,
  selected,
  inset,
  scrollRef,
  virtualizer,
}: {
  /** The storage key; a second day-scoped list would need its own entry (and its own shape). */
  container: "records";
  /** Which of the list's orders this position belongs to (`time:desc`, …). */
  slot: string;
  /** Local midnight of the day the list shows. */
  day: number;
  /** Every row in display order, with the value the list is ordered by. */
  rows: readonly AnchorRow[];
  /** The open record, if any — revealed when there is no position to go back to. */
  selected: string | null;
  /** How much of the top of the viewport the sticky header covers. */
  inset: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  virtualizer: VirtualWindow;
}) {
  const pending = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The first row the operator sees whole — the row a half-scrolled neighbour
   * above it belongs to what was already scrolled past.
   *
   * Rows behind the sticky header are on screen in the DOM sense and hidden in
   * every other sense, so the header's height is taken off the top: without that
   * the row saved would be the one hidden *under* the header, and putting it back
   * would hide it again on every visit.
   */
  const topIndex = useCallback((): number | null => {
    const element = scrollRef.current;
    if (element === null) return null;
    const covered = element.scrollTop + inset;
    const items = virtualizer.getVirtualItems();
    // Nothing starts below the readable top only when the last row is taller than
    // the viewport, and then the row covering it is the only candidate there is.
    const first = items.find((item) => item.start >= covered) ?? items[0];
    return first?.index ?? null;
  }, [inset, scrollRef, virtualizer]);

  /**
   * Writes what has been scrolled since the last save. Called by the debounce, by
   * leaving a view, and by unmounting the list — a quick click away must not cost
   * the position the operator just scrolled to.
   */
  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const state = pending.current;
    pending.current = null;
    if (state === null) return;
    const stored = Effect.runSync(service.scroll.get(container));
    // A value from another day belongs to that day's records: carrying it into
    // this list would land on a row that means something else entirely. The
    // stored one is replaced instead of merged.
    const values =
      stored.day === state.day
        ? { ...stored.values, [state.slot]: state.value }
        : { [state.slot]: state.value };
    // Written synchronously rather than forked: the effect that restores the
    // position reads this store on the very next line, so a write that lands a
    // tick later would hand it the position from before the scroll.
    const written = Effect.runSync(
      Effect.either(service.scroll.set(container, { day: state.day, values })),
    );
    // A position is not a write the operator can retry, and a list still scrolls
    // on a full disk. Reported, never raised.
    if (written._tag === "Left") log.error(`scroll: ${written.left.message}`);
  }, [container]);

  useEffect(() => {
    if (rows.length === 0) return;
    // A scroll still inside the debounce is where the list actually is: write it
    // before reading, or the position put back is the one from before that
    // scroll. (Clicking a row a moment after scrolling used to snap the list back
    // to the previous position this way.)
    flush();
    const anchor = Effect.runSync(service.scroll.get(container));
    const saved = anchor.day === day ? anchor.values[slot] : undefined;
    const open = selected === null ? -1 : rows.findIndex((row) => row.id === selected);
    // The remembered place wins over the open record: it is where the operator
    // was, and the detail pane is still showing that record either way.
    const next = saved === undefined ? (open === -1 ? 0 : open) : nearestRow(rows, saved);
    // Already where it would be sent. This guard is what keeps the position from
    // being re-applied — and a half-scrolled row snapped flush to the top — on
    // every render the row set is rebuilt for an unrelated reason.
    if (next === topIndex()) return;
    // A remembered row goes to the readable top; a revealed one only has to be
    // reachable (the virtualizer scrolls to the nearest edge, and does nothing
    // when it is already in view).
    virtualizer.scrollToIndex(next, {
      align: saved === undefined && open !== -1 ? "auto" : "start",
    });
  }, [container, day, slot, rows, selected, topIndex, virtualizer, flush]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;
    const onScroll = () => {
      const index = topIndex();
      const row = index === null ? undefined : rows[index];
      // Nothing readable on top (the list is not measured yet, or is empty).
      if (row === undefined) return;
      pending.current = { day, slot, value: row.value };
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [day, slot, rows, topIndex, flush, scrollRef]);

  // Leaving a view — another day, another order, the screen itself — writes the
  // position it was left at, as that view's position. React runs this cleanup
  // before the next effect, so the new view's own restore (above) reads a store
  // that already holds what was just scrolled.
  useEffect(() => () => flush(), [day, slot, flush]);
}
