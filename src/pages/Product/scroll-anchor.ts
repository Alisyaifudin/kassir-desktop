import type { ScrollAnchor } from "~/services/scroll";

/** What the product list remembers: the product it starts at, and the box's offset. */
export type ListAnchor = ScrollAnchor["products"];

/** The two ways the product list is drawn. */
export type ListView = "grid" | "table";

/**
 * Where the box has to be scrolled to, out of what was stored.
 *
 * Three answers, in the order they matter:
 *
 * 1. **Another list** — another page, another filter, another sort — starts at the
 *    top. The stored offset belongs to rows that are no longer the ones on screen;
 *    the same reasoning that moves the paginator back to page 1 applies to the
 *    scrollbar.
 * 2. **The same view** puts the box back where it was, to the pixel. The rows and
 *    the layout are the same ones the position was read on, so re-deriving it from
 *    a product would only add rounding.
 * 3. **The other view** cannot reuse an offset — a card and a row are not the same
 *    height, and a grid has columns the table does not — so it puts the product that
 *    was on top at the top instead. That is what makes a toggle between grid and
 *    table land on the same part of the catalogue instead of on the first page.
 *
 * `offsetOf` answers "where would the box have to be for this product to sit at the
 * top of the readable area", or `null` when the product is not on this page.
 */
export function restoreOffset(
  anchor: ListAnchor,
  listKey: string,
  view: ListView,
  offsetOf: (id: string) => number | null,
): number {
  if (anchor.key !== listKey) return 0;
  if (anchor.view === view) return anchor.top;
  if (anchor.id === null) return 0;
  return offsetOf(anchor.id) ?? 0;
}
