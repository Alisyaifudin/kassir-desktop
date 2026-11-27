import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from "react";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";
import type { OffsetContainer } from "~/services/scroll";

/** How long the box has to stand still before its place is written. */
const SAVE_DELAY_MS = 150;

type Pending = { slot: string; top: number };

/**
 * Remembers a scroll box's offset, one per **slot**: a tab, a face of a rail, a
 * record, anything one box is re-used for.
 *
 * Those two lists have the same problem and it is not the virtualized ones': the box
 * outlives what it is showing, so the operator who switches tab (or rail face) finds
 * the next list at the offset the previous one was left at — a place in a different
 * list. Keying the offset on the slot gives each of them its own, and a slot that was
 * never scrolled starts at the top.
 *
 * Returns the **callback ref** for the box. It also catches the box being re-mounted
 * around it (a stage toggle, a search taking a panel over), and it is a callback
 * rather than a ref object because the element is what the effects key on.
 *
 * The reads and writes are synchronous on purpose: the position lives in memory in
 * `services/scroll`, and a write that landed a tick after the next slot's restore
 * would hand it the offset from before the switch.
 */
export function useScrollOffset(
  container: OffsetContainer,
  slot: string | null,
): RefCallback<HTMLDivElement> {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const pending = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Writes what has been scrolled since the last save. Called by the debounce, and
   * by the box going away — another tab, another stage, another face — which is
   * exactly when the position is needed.
   *
   * The slot travels with the offset (`pending`), not with the box: a flush that
   * fires after a switch still belongs to the list that was scrolled, or the two
   * would swap places.
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
    const written = Effect.runSync(
      Effect.either(
        service.scroll.set(container, {
          positions: { ...stored.positions, [state.slot]: state.top },
        }),
      ),
    );
    // A position is not a write the operator can retry, and a list still scrolls on
    // a full disk. Reported, never raised.
    if (written._tag === "Left") log.error(`scroll: ${written.left.message}`);
  }, [container]);

  // Before paint: switching slots must not show the other list's offset for a frame.
  useLayoutEffect(() => {
    if (element === null || slot === null) return;
    // A scroll still inside the debounce is where the box actually is.
    flush();
    const stored = Effect.runSync(service.scroll.get(container));
    const target = Math.max(0, stored.positions[slot] ?? 0);
    // Already there: the box kept its offset and nothing has to move.
    if (Math.abs(element.scrollTop - target) < 1) return;
    const apply = () => {
      element.scrollTop = target;
      return Math.abs(element.scrollTop - target) < 1;
    };
    if (apply()) return;
    // The box cannot take the offset *yet*: it is a loader, or the chunk behind it
    // has not arrived, so the browser clamped the write and the position would be
    // lost for good — which is what "back goes to the top" was. Keep the intent and
    // apply it as the content grows into it.
    return settle(element, apply);
  }, [element, container, slot, flush]);

  // A layout effect so that the order holds: React runs the leaving box's cleanup
  // before the arriving box's effect, so a slot is written before the next is read.
  useLayoutEffect(() => {
    if (element === null || slot === null) return;
    const onScroll = () => {
      pending.current = { slot, top: element.scrollTop };
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      flush();
    };
  }, [element, slot, flush]);

  return setElement;
}

/** How long a restore keeps waiting for content that is still on its way. */
const SETTLE_MS = 3_000;

/**
 * Applies `apply` again whenever the box's content changes size, until it lands.
 *
 * A restored offset is only reachable if the rows are already in the box. On a screen
 * that mounts behind a skeleton — every lazy body and every query this app runs — the
 * first write is clamped to the little content there is, and waiting for the next
 * render is not enough: the rows arrive *after* it. The box's own size never changes
 * when its content grows, so what is watched is the children, re-observed whenever a
 * chunk or a loader hands over.
 *
 * Bounded, because an offset the content can never reach would otherwise write itself
 * back on top of the operator for the rest of the session.
 */
function settle(element: HTMLDivElement, apply: () => boolean): () => void {
  if (typeof ResizeObserver === "undefined") return () => {};
  const observer = new ResizeObserver(() => {
    if (apply()) stop();
  });
  const watch = () => {
    observer.disconnect();
    if (element.childElementCount === 0) observer.observe(element);
    for (const child of element.children) observer.observe(child);
  };
  watch();
  const mutations =
    typeof MutationObserver === "undefined" ? null : new MutationObserver(watch);
  mutations?.observe(element, { childList: true });
  const timer = setTimeout(() => stop(), SETTLE_MS);
  function stop() {
    clearTimeout(timer);
    mutations?.disconnect();
    observer.disconnect();
  }
  return stop;
}
