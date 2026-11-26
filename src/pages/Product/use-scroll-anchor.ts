import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from "react";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";
import { restoreOffset, type ListAnchor, type ListView } from "./scroll-anchor";

/** How long the list has to stand still before its place is written. */
const SAVE_DELAY_MS = 150;

/** The one thing in either view that says which product it is. */
const ITEM = "[data-product-id]";

/** The storage key. */
const CONTAINER = "products";

/**
 * Remembers where the product list was scrolled to — and, across the view toggle,
 * *which product* it was scrolled to.
 *
 * The page runs on the paginator, so the page number is already in the URL; what is
 * left is the offset inside the current page and the product at its top-left. Both
 * are written together because the two views cannot share an offset (cards in a row
 * are not rows) but can always share a product — see `restoreOffset`.
 *
 * Returns the **callback ref** to give whichever view is drawn. Toggling grid ⇄
 * table mounts a different scroll box, so the hook has to see one arrive (to put the
 * remembered product on top of it) and see the other leave (to write where it was
 * left, in its own view, before the store is read again).
 *
 * The reads and writes are synchronous on purpose: the position is stored in memory
 * by `services/scroll`, and a write that landed a tick after the next view's restore
 * would hand it the position from before the toggle.
 */
export function useScrollAnchor({
  listKey,
  view,
}: {
  /** Which result set the position belongs to — see `resultKey`. */
  listKey: string;
  view: ListView;
}): RefCallback<HTMLDivElement> {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const pending = useRef<ListAnchor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Writes what has been scrolled since the last save. Called by the debounce, and
   * by the box going away — a quick click on a product, or a toggle to the other
   * view, must not cost the place the operator had scrolled to.
   */
  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const anchor = pending.current;
    pending.current = null;
    if (anchor === null) return;
    const written = Effect.runSync(Effect.either(service.scroll.set(CONTAINER, anchor)));
    // A position is not a write the operator can retry, and a list still scrolls on
    // a full disk. Reported, never raised.
    if (written._tag === "Left") log.error(`scroll: ${written.left.message}`);
  }, []);

  // Put the box back before it is painted: a paginator that moves to another page
  // must not show the previous page's offset for a frame.
  useLayoutEffect(() => {
    if (element === null) return;
    // A scroll still inside the debounce is where the box actually is. Writing it
    // first means the stored position read below is the one on screen.
    flush();
    const anchor = Effect.runSync(service.scroll.get(CONTAINER));
    const target = Math.max(0, restoreOffset(anchor, listKey, view, (id) => offsetOf(element, id)));
    // Already there: re-applying would only nudge a half-scrolled row flush.
    if (Math.abs(element.scrollTop - target) < 1) return;
    element.scrollTop = target;
  }, [element, listKey, view, flush]);

  // Both halves live in a layout effect so that the order is the one that matters:
  // React runs the leaving box's cleanup before the arriving box's effect, so the
  // toggle writes the grid's position before the table reads it.
  useLayoutEffect(() => {
    if (element === null) return;
    const onScroll = () => {
      const top = element.scrollTop;
      pending.current = { key: listKey, view, id: idOnTop(element, top), top };
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      flush();
    };
  }, [element, listKey, view, flush]);

  return setElement;
}

/**
 * The product at the top-left of the readable area: the first card or row that is on
 * screen whole, in the order the view lays them out.
 *
 * The sticky header of the table covers the top of its box, so it comes off before
 * anything is compared — a row under the header is on screen in the DOM sense and
 * hidden in every other sense. Nothing starts below the readable top only when the
 * last row of the page is taller than the box, and then that row is the only
 * candidate there is.
 */
function idOnTop(element: HTMLDivElement, top: number): string | null {
  const readable = top + insetOf(element);
  const box = element.getBoundingClientRect().top;
  let last: HTMLElement | null = null;
  for (const item of itemsOf(element)) {
    last = item;
    if (item.getBoundingClientRect().top - box + top >= readable) return idOf(item);
  }
  return last === null ? null : idOf(last);
}

/** The offset that puts `id` at the top of the readable area, or `null` if it is not on this page. */
function offsetOf(element: HTMLDivElement, id: string): number | null {
  const box = element.getBoundingClientRect().top + insetOf(element);
  for (const item of itemsOf(element)) {
    if (idOf(item) !== id) continue;
    return Math.max(0, item.getBoundingClientRect().top - box + element.scrollTop);
  }
  return null;
}

function itemsOf(element: HTMLDivElement): NodeListOf<HTMLElement> {
  return element.querySelectorAll<HTMLElement>(ITEM);
}

function idOf(item: HTMLElement): string | null {
  return item.dataset.productId ?? null;
}

/** How much of the top of the box the sticky header covers — nothing in the grid. */
function insetOf(element: HTMLDivElement): number {
  return element.querySelector("thead")?.offsetHeight ?? 0;
}
