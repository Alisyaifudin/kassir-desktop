/**
 * The listing grid's geometry. Navigation keeps a column index and looks up the
 * cell that owns it, so a wide cell (`nama`, `grandTotal`, `diskon`) behaves like
 * a merged cell in a spreadsheet: moving up from `kuantitas` (col 5) lands in
 * `nama`, and moving up again uses the remembered column to land in the next
 * card's `kuantitas`.
 *
 * Columns are 0-indexed, thirteen wide. Column 0 is the product's photo — a cell
 * of **both** rows, because the box is one box drawn beside both of them: the
 * cursor can stand in the top half of it or the bottom half, and `right` leaves it
 * into the half it is standing in. The rest is the spreadsheet: `no#` and the drag
 * handle are selectable but not editable — the number opens the product's detail
 * sheet, the handle locks the card so the arrows can move it. A card whose goods
 * have no picture draws the same box with their initials in it, and gives the
 * cursor no cell to land on, because there is no gallery behind it.
 *
 * One grid for both cart screens: `layout` carries the only real difference —
 * the sale screen ends its header with a stage toggle (`Tambahan`), the purchase
 * screen's header is just search + manual.
 */

export type Field =
  | "image"
  | "no"
  | "name"
  | "grandTotal"
  | "x"
  | "grip"
  | "code"
  | "qty"
  | "unit"
  | "price"
  | "diskon";

/** Every cell, including the header's, which only draw. */
type AnyField = Field | "search" | "manual" | "toggle";

export type RowRef = { kind: "header" } | { kind: "card"; cardId: string; part: "top" | "bottom" };

/** The three sub-cells inside `Kuantitas`: `-`, the value, `+`. */
export type QtySub = "left" | "value" | "right";

export type Selection = { row: RowRef; col: number; qtySub?: QtySub };

type CellDef = {
  field: AnyField;
  start: number;
  end: number;
  selectable: boolean;
  editable: boolean;
  /**
   * The cell holds a number: a digit typed while it is selected opens the editor
   * with that digit instead of doing nothing (see `typedDigit`).
   */
  numeric?: boolean;
  /**
   * A text cell: typing any printable character while it is selected opens its
   * editor with that character, the way a spreadsheet does. A digit also counts
   * — a name or a code can start with one.
   */
  textSeed?: boolean;
};

/**
 * Which optional cells the grid has.
 *
 * `photo` is the card's first column: the cart draws the product's picture there —
 * or the goods' initials in the same box — on every card, cover or not. The combo
 * stage draws no such box, and its cards are the twelve columns after it.
 *
 * It lives here, on the layout, rather than on each `RowRef`: a row is built in a
 * dozen places (a click, a scan, a step of the walk), and one of them forgetting
 * the flag put the cursor on the wrong cell. The screen knows; the row does not
 * have to be told.
 */
export type ListingLayout = { stageToggle: boolean; manual?: boolean; photo: boolean };

/** The sale screen: search, `+manual`, the `Tambahan` stage toggle, the photo. */
export const SALE_LISTING_LAYOUT: ListingLayout = { stageToggle: true, photo: true };

/** The purchase screen: search and `+manual` only, and the photo. */
export const PURCHASE_LISTING_LAYOUT: ListingLayout = { stageToggle: false, photo: true };

/** Combo templates have the POS stage toggle but no manual-line action — nor a photo. */
export const COMBO_LISTING_LAYOUT: ListingLayout = {
  stageToggle: true,
  manual: false,
  photo: false,
};

/**
 * The header's cells.
 *
 * On the cart screens the search bar runs from the **very first column**, over the
 * photo's, because the bar is the width of the list rather than of one column: a
 * card's cells start at column 1, and the search box that labels them starts one to
 * the left. The combo stage draws no photo, so its columns are the twelve after the
 * photo's and its header starts at 1 (see `GridHeader`).
 */
function headerCells(layout: ListingLayout): CellDef[] {
  if (layout.stageToggle && layout.manual === false) {
    return [
      { field: "search", start: 1, end: 10, selectable: true, editable: true },
      { field: "toggle", start: 11, end: 12, selectable: true, editable: false },
    ];
  }
  if (!layout.stageToggle && layout.manual === false) {
    return [{ field: "search", start: 0, end: 12, selectable: true, editable: true }];
  }
  if (layout.stageToggle) {
    return [
      { field: "search", start: 0, end: 8, selectable: true, editable: true },
      { field: "manual", start: 9, end: 10, selectable: true, editable: false },
      { field: "toggle", start: 11, end: 12, selectable: true, editable: false },
    ];
  }
  return [
    { field: "search", start: 0, end: 10, selectable: true, editable: true },
    { field: "manual", start: 11, end: 12, selectable: true, editable: false },
  ];
}

/**
 * The product photo: the card's first column, as tall as both of its rows. It is
 * part of the grid the cells are in, so the header's first track and the photo
 * are the same width and the labels sit over the columns they name.
 */
const IMAGE_CELL: CellDef = {
  field: "image",
  start: 0,
  end: 0,
  selectable: true,
  editable: false,
};

const TOP_CELLS: CellDef[] = [
  { field: "no", start: 1, end: 1, selectable: true, editable: false },
  { field: "name", start: 2, end: 9, selectable: true, editable: true, textSeed: true },
  { field: "grandTotal", start: 10, end: 11, selectable: true, editable: false },
  { field: "x", start: 12, end: 12, selectable: true, editable: false },
];

const BOTTOM_CELLS: CellDef[] = [
  { field: "grip", start: 1, end: 1, selectable: true, editable: false },
  { field: "code", start: 2, end: 5, selectable: true, editable: true, textSeed: true },
  { field: "qty", start: 6, end: 6, selectable: true, editable: true, numeric: true },
  { field: "unit", start: 7, end: 7, selectable: true, editable: true, numeric: true },
  { field: "price", start: 8, end: 9, selectable: true, editable: true, numeric: true },
  { field: "diskon", start: 10, end: 12, selectable: true, editable: false },
];

const CARD_CELLS = [IMAGE_CELL, ...TOP_CELLS, ...BOTTOM_CELLS];

export function cellsForRow(row: RowRef, layout: ListingLayout): CellDef[] {
  if (row.kind === "header") return headerCells(layout);
  const cells = row.part === "bottom" ? BOTTOM_CELLS : TOP_CELLS;
  // Both rows carry the photo: it is one box, but the cursor is in a row while it
  // stands there, and that row is what `right` leaves into.
  return layout.photo ? [IMAGE_CELL, ...cells] : cells;
}

export function selectableCells(row: RowRef, layout: ListingLayout): CellDef[] {
  return cellsForRow(row, layout).filter((cell) => cell.selectable);
}

/**
 * The column a header cell starts at, per the layout.
 *
 * The header's own numbers used to live in each screen — `manualColumn(8 : 10)`,
 * `TOGGLE_COLUMN = 10` — and every one of them had to be hand-shifted the day the
 * card grid grew its photo column; one was missed. They are read off the model
 * now instead, so the layout is the only place the geometry is written down.
 */
export function headerStartOf(
  field: "search" | "manual" | "toggle",
  layout: ListingLayout,
): number {
  return headerCells(layout).find((cell) => cell.field === field)?.start ?? 1;
}

function distance(cell: CellDef, col: number): number {
  if (col < cell.start) return cell.start - col;
  if (col > cell.end) return col - cell.end;
  return 0;
}

/** The selectable cell that owns `col`, or the nearest one when none does. */
export function cellAt(row: RowRef, col: number, layout: ListingLayout): CellDef {
  const cells = selectableCells(row, layout);
  const hit = cells.find((cell) => col >= cell.start && col <= cell.end);
  if (hit !== undefined) return hit;
  return cells.reduce((best, cell) => (distance(cell, col) < distance(best, col) ? cell : best));
}

/** The column to remember when moving into `cell` from `col`. */
export function columnIn(cell: CellDef, col: number): number {
  return Math.min(Math.max(col, cell.start), cell.end);
}

export function sameRow(a: RowRef, b: RowRef): boolean {
  if (a.kind === "header" || b.kind === "header") return a.kind === b.kind;
  return a.cardId === b.cardId && a.part === b.part;
}

/** A cell the cursor can be sent to: the row, the column to remember, and the cell. */
export type GridTarget = { row: RowRef; col: number; cell: CellDef };

/**
 * The vertical order: header, then each card's top and bottom rows.
 *
 * Every card of a layout with a photo column has the same cells, cover or not, so
 * this needs no callback to say which cards draw one — the layout already does.
 */
export function rowsFor(cardIds: readonly string[]): RowRef[] {
  return [
    { kind: "header" },
    ...cardIds.flatMap((cardId): RowRef[] => [
      { kind: "card", cardId, part: "top" },
      { kind: "card", cardId, part: "bottom" },
    ]),
  ];
}

/** Which half of a card a field lives in. The photo is one box, so a click on it
 *  puts the cursor on its top half; `down` moves to the bottom half from there. */
export function partOf(field: Field): "top" | "bottom" {
  if (field === "image") return "top";
  return TOP_CELLS.some((cell) => cell.field === field) ? "top" : "bottom";
}

/** The column a field's cell starts at. */
export function startOf(field: Field): number {
  return CARD_CELLS.find((cell) => cell.field === field)?.start ?? 2;
}

/**
 * The cell one step horizontally from `selection`, or `undefined` when there is
 * none. `wrap` joins the two ends of the grid — which is what an arrow that ran
 * out of an open editor does — so the key never feels ignored.
 *
 * The walk is row-major, the spreadsheet's reading order, and the photo is simply
 * the first cell of **both** rows: one box drawn beside both of them, so the
 * cursor can stand in its top half or in its bottom half, and what `right` does
 * depends on which — into the number above, into the handle below.
 *
 * `left` out of the photo is the one step the reading order gets wrong. Out of the
 * top half it already leaves the card (the box is its first cell, so the one
 * before it is the previous card's last cell); out of the bottom half it would
 * climb to the `x` of the row above — a hop *into* the card, out of a box that
 * looks exactly the same in both halves. So `left` leaves the card from either
 * half, which is the previous card a cursor on the left edge expects.
 */
export function horizontalNeighbour(
  rows: readonly RowRef[],
  selection: Selection,
  layout: ListingLayout,
  delta: number,
  { wrap = false }: { wrap?: boolean } = {},
): GridTarget | undefined {
  const cell = cellAt(selection.row, selection.col, layout);
  // The walkable cells in reading order: the header's, then each card's top row
  // and bottom row. Rebuilt per press, like the row model it mirrors.
  const flat = rows.flatMap((row) =>
    selectableCells(row, layout).map((own) => ({ row, cell: own })),
  );
  const index = flat.findIndex(
    (entry) => sameRow(entry.row, selection.row) && entry.cell.field === cell.field,
  );
  if (index === -1) return undefined;

  const row = selection.row;
  if (cell.field === "image" && row.kind === "card" && delta < 0) {
    // The card's own first cell, whether the cursor stands in the box's top half
    // or its bottom half: one step back from *there* is out of the card.
    const first = flat.findIndex(
      (entry) =>
        entry.cell.field === "image" &&
        entry.row.kind === "card" &&
        entry.row.cardId === row.cardId,
    );
    const out = first > 0 ? flat[first - 1] : wrap ? flat[flat.length - 1] : undefined;
    return out === undefined ? undefined : { row: out.row, col: out.cell.start, cell: out.cell };
  }

  const next = flat[index + delta] ?? (wrap ? flat[delta < 0 ? flat.length - 1 : 0] : undefined);
  return next === undefined ? undefined : { row: next.row, col: next.cell.start, cell: next.cell };
}

/**
 * The cell one row up or down from `selection`, or `undefined` at the ends of the
 * list.
 *
 * The photo is the one cell the vertical walk treats differently. It is drawn
 * beside both rows, so the row model carries it twice, and a plain step would move
 * the cursor from the top half of the box into the bottom half of the same box —
 * one press that changes nothing on screen, then another that finally leaves the
 * card. So a step off the photo skips its other half and lands on the neighbouring
 * card's photo, which is the only place that press was ever going to.
 *
 * The half it lands in is decided by the direction: arriving from above means the
 * top half, arriving from below the bottom half. That is what `right` then reads —
 * out of the top half into the number, out of the bottom half into the handle — so
 * the box answers the same way whether it was reached by a click, by `left` from a
 * row, or by a step from the card next door.
 */
export function verticalNeighbour(
  rows: readonly RowRef[],
  selection: Selection,
  layout: ListingLayout,
  delta: number,
): GridTarget | undefined {
  const index = rows.findIndex((row) => sameRow(row, selection.row));
  if (index === -1) return undefined;

  const cell = cellAt(selection.row, selection.col, layout);
  const half = cell.field === "image" && selection.row.kind === "card" ? selection.row.part : null;
  // Down out of the top half and up out of the bottom half are the two steps whose
  // next row is the other half of the same box.
  const skip = half === (delta > 0 ? "top" : "bottom") ? 1 : 0;
  const next = rows[index + delta * (1 + skip)];
  if (next === undefined) return undefined;

  const landed = cellAt(next, selection.col, layout);
  const row: RowRef =
    landed.field === "image" && next.kind === "card"
      ? { ...next, part: delta > 0 ? "top" : "bottom" }
      : next;
  return { row, col: columnIn(landed, selection.col), cell: landed };
}
