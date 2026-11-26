import { Context, Data, Effect } from "effect";

export class ScrollError extends Data.TaggedError("ScrollError")<{ message: string }> {}

/** The lists whose place is remembered between visits. */
export type ScrollContainer = "records";

/**
 * Where a list was left: the sort value of the first row that was on screen whole,
 * kept once per order the list can be shown in (`time:desc`, `total:asc`, …).
 */
export type ScrollAnchor = {
  /** The local day the position was read on; a position from another day is stale. */
  day: number | null;
  /** Slot → sort value of the row that was on top. */
  values: Record<string, number>;
};

export class ScrollService extends Context.Tag("ScrollService")<
  ScrollService,
  {
    get: (container: ScrollContainer) => Effect.Effect<ScrollAnchor>;
    set: (container: ScrollContainer, anchor: ScrollAnchor) => Effect.Effect<void, ScrollError>;
  }
>() {}
