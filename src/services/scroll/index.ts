import { Context, Data, Effect } from "effect";

export class ScrollError extends Data.TaggedError("ScrollError")<{ message: string }> {}

/** The place each list was left at, in the shape that list can be put back from. */
export type ScrollAnchor = {
  /**
   * Records: the sort value of the first row that was on screen whole, once per
   * order the list can be shown in (`time:desc`, `total:asc`, …).
   */
  records: {
    /** The local day the position was read on; a position from another day is stale. */
    day: number | null;
    /** Slot → sort value of the row that was on top. */
    values: Record<string, number>;
  };
  /**
   * Products: the product the list starts at, and the box's own offset. Both, because
   * the two views of that list can share a product but not a pixel.
   */
  products: {
    /** Which result set (filters, sort, page, size) the position was read on. */
    key: string;
    /** The view it was read in; the other view re-derives its own offset. */
    view: string;
    /** The product at the top-left of what was on screen, if there was one. */
    id: string | null;
    /** The box's scroll offset, reused only in the view it was read in. */
    top: number;
  };
  /**
   * Cart: where the goods list of each open cart (tab) was scrolled to. One entry
   * per cart, because the strip swaps the rows under a single scroll box.
   */
  cart: {
    /** Draft id → the box's scroll offset. */
    positions: Record<string, number>;
  };
  /**
   * Analytics: where the shell's content box was left. The shape is the same map as
   * the cart's — the hook that reads both takes a slot — but the shell has one box,
   * so it holds one entry.
   */
  analytics: {
    /** Slot → the content box's scroll offset. */
    positions: Record<string, number>;
  };
  /**
   * A record's page: the ledger (goods, charges, parties, shelf) and the receipt are
   * one scroll each, and each keeps one place — not one per record.
   */
  ledger: {
    /** Slot → the box's scroll offset: `box` for the ledger, `receipt` for the Resi tab. */
    positions: Record<string, number>;
  };
};

export type ScrollContainer = keyof ScrollAnchor;

/**
 * The containers that keep one plain offset per slot — no row, no product to name,
 * only where the box was. Derived from the shapes above, so a list that stores a
 * `positions` map can use the shared offset hook without a second list to maintain.
 */
export type OffsetContainer = {
  [C in ScrollContainer]: ScrollAnchor[C] extends { positions: Record<string, number> }
    ? C
    : never;
}[ScrollContainer];

export class ScrollService extends Context.Tag("ScrollService")<
  ScrollService,
  {
    get: <C extends ScrollContainer>(container: C) => Effect.Effect<ScrollAnchor[C]>;
    /** Each list writes its own anchor, and only its own. */
    set: <C extends ScrollContainer>(
      container: C,
      anchor: ScrollAnchor[C],
    ) => Effect.Effect<void, ScrollError>;
  }
>() {}
