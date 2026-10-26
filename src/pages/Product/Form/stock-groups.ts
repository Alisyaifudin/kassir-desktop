import type { StockDraft } from "./types";
import { parseNumber } from "./types";

/**
 * A lot that holds no stock: its quantity is entered and it is not positive.
 *
 * A lot with no quantity *yet* is not empty — that is a row the cashier is still
 * filling in, and folding it the moment it appears would make `Tambah lot` look
 * like it did nothing.
 */
export function isEmptyLot(stock: StockDraft): boolean {
  if (stock.value.trim() === "") return false;
  return parseNumber(stock.value) <= 0;
}

type StockGroups = {
  /** Lots that still hold stock — the rows the section lists outright. */
  active: StockDraft[];
  /** Sold-out lots, folded behind the accordion. */
  folded: StockDraft[];
};

/**
 * Splits the section's rows into the ones worth showing and the ones worth
 * folding away.
 *
 * The journal leaves every lot behind when it sells out, so an old product
 * carries a pile of rows that hold nothing; they are still worth keeping — they
 * are the cost history — but not worth the room. A product with one lot is never
 * folded: that lot is the product's stock, sold out or not.
 *
 * `foldable` is the caller's answer to "may this row disappear while I look at
 * it". A persisted lot may; a row being typed into may not, or the digit `0`
 * would yank the input out from under the cursor.
 */
export function groupStocks(
  stocks: readonly StockDraft[],
  foldable: (stock: StockDraft) => boolean,
): StockGroups {
  if (stocks.length <= 1) return { active: [...stocks], folded: [] };
  const isFolded = (stock: StockDraft) => foldable(stock) && isEmptyLot(stock);
  return {
    active: stocks.filter((stock) => !isFolded(stock)),
    folded: stocks.filter(isFolded),
  };
}

/**
 * The accordion's label: how many lots it holds and what they cost —
 * `2 lot habis · Modal 500–1.200`, or one figure when they all cost the same
 * (which is also the "only one lot" case). The range is what a narrowed list can
 * honestly say: the lots inside no longer share a single cost.
 */
export function foldedLabel(lots: readonly StockDraft[]): string {
  const capitals = lots.map((lot) => parseNumber(lot.capital)).sort((a, b) => a - b);
  const low = capitals[0] ?? 0;
  const high = capitals[capitals.length - 1] ?? low;
  const format = (value: number) => value.toLocaleString("id-ID");
  const range = low === high ? format(low) : `${format(low)}–${format(high)}`;
  return `${lots.length} lot habis · Modal ${range}`;
}
