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
};

export type ScrollContainer = keyof ScrollAnchor;

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
