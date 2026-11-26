import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from "react";
import { Effect } from "effect";
import { log } from "~/lib/log";
import { service } from "~/services";

/** How long the list has to stand still before its place is written. */
const SAVE_DELAY_MS = 150;

/** The storage key. */
const CONTAINER = "cart";

type Pending = { cart: string; top: number };

/**
 * Remembers where the goods list was scrolled to, **per open cart**.
 *
 * The tab strip swaps the rows under one scroll box rather than mounting a box per
 * cart, so without this the list keeps whatever offset the previous tab happened to
 * be at — the same place in a different sale, which is nowhere. Keyed on the draft
 * id, so every tab comes back to its own place and a cart that has never been
 * scrolled starts at the top.
 *
 * Returns the callback ref for the box, which also catches the box being re-mounted
 * around it: leaving the goods stage for `Tambahan` and coming back, and the search
 * results taking the panel over (the cart's place survives a search).
 *
 * The reads and writes are synchronous on purpose: the position lives in memory in
 * `services/scroll`, and a write that landed a tick after the next cart's restore
 * would hand it the offset from the cart before it.
 */
export function useListingScroll(cartId: string | null): RefCallback<HTMLDivElement> {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const pending = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Writes what has been scrolled since the last save. Called by the debounce, and
   * by the box going away — a click into another tab, a stage toggle, a search —
   * which is exactly when the position is needed.
   *
   * The cart id travels with the offset (`pending`), not with the box: a flush that
   * fires after a tab switch still belongs to the tab that was scrolled, or the two
   * carts would swap places.
   */
  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const state = pending.current;
    pending.current = null;
    if (state === null) return;
    const stored = Effect.runSync(service.scroll.get(CONTAINER));
    const written = Effect.runSync(
      Effect.either(
        service.scroll.set(CONTAINER, {
          positions: { ...stored.positions, [state.cart]: state.top },
        }),
      ),
    );
    // A position is not a write the operator can retry, and a list still scrolls on
    // a full disk. Reported, never raised.
    if (written._tag === "Left") log.error(`scroll: ${written.left.message}`);
  }, []);

  // Before paint: switching tabs must not show the other cart's offset for a frame.
  useLayoutEffect(() => {
    if (element === null || cartId === null) return;
    // A scroll still inside the debounce is where the box actually is.
    flush();
    const stored = Effect.runSync(service.scroll.get(CONTAINER));
    const target = Math.max(0, stored.positions[cartId] ?? 0);
    // Already there: the box has kept its offset and nothing has to move.
    if (Math.abs(element.scrollTop - target) < 1) return;
    element.scrollTop = target;
  }, [element, cartId, flush]);

  // A layout effect so that the order holds: React runs the leaving box's cleanup
  // before the arriving box's effect, so a cart is written before the next one is
  // read.
  useLayoutEffect(() => {
    if (element === null || cartId === null) return;
    const onScroll = () => {
      pending.current = { cart: cartId, top: element.scrollTop };
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      flush();
    };
  }, [element, cartId, flush]);

  return setElement;
}
