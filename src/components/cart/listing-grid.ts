/**
 * The listing grid's geometry. Navigation keeps a column index and looks up the
 * cell that owns it, so a wide cell (`nama`, `grandTotal`, `diskon`) behaves like
 * a merged cell in a spreadsheet: moving up from `kuantitas` (col 5) lands in
 * `nama`, and moving up again uses the remembered column to land in the next
 * card's `kuantitas`.
 *
 * Columns are 0-indexed, twelve wide. `no#` and the drag handle are selectable
 * but not editable: the number opens the product's detail sheet, the handle locks
 * the card so the arrows can move it. The product's photo sits at column `-1`,
 * left of both rows: it only exists when the line actually has a cover, and it is
 * selectable so the keyboard can reach the gallery too.
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

export type RowRef =
  | { kind: "header" }
  /** `image` is set on a card's top row when the line has a cover to show. */
  | { kind: "card"; cardId: string; part: "top" | "bottom"; image?: boolean };

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

/** Which optional header cells the grid has. */
export type ListingLayout = { stageToggle: boolean; manual?: boolean };

/** The sale screen: search, `+manual`, and the `Tambahan` stage toggle. */
export const SALE_LISTING_LAYOUT: ListingLayout = { stageToggle: true };

/** The purchase screen: search and `+manual` only. */
export const PURCHASE_LISTING_LAYOUT: ListingLayout = { stageToggle: false };

/** Combo templates have the POS stage toggle but no manual-line action. */
export const COMBO_LISTING_LAYOUT: ListingLayout = { stageToggle: true, manual: false };

function headerCells(layout: ListingLayout): CellDef[] {
  if (layout.stageToggle && layout.manual === false) {
    return [
      { field: "search", start: 0, end: 9, selectable: true, editable: true },
      { field: "toggle", start: 10, end: 11, selectable: true, editable: false },
    ];
  }
  if (!layout.stageToggle && layout.manual === false) {
    return [{ field: "search", start: 0, end: 11, selectable: true, editable: true }];
  }
  if (layout.stageToggle) {
    return [
      { field: "search", start: 0, end: 7, selectable: true, editable: true },
      { field: "manual", start: 8, end: 9, selectable: true, editable: false },
      { field: "toggle", start: 10, end: 11, selectable: true, editable: false },
    ];
  }
  return [
    { field: "search", start: 0, end: 9, selectable: true, editable: true },
    { field: "manual", start: 10, end: 11, selectable: true, editable: false },
  ];
}

/** The product photo: left of both rows, so it only lives on the card's top row. */
const IMAGE_CELL: CellDef = {
  field: "image",
  start: -1,
  end: -1,
  selectable: true,
  editable: false,
};

const TOP_CELLS: CellDef[] = [
  { field: "no", start: 0, end: 0, selectable: true, editable: false },
  { field: "name", start: 1, end: 8, selectable: true, editable: true, textSeed: true },
  { field: "grandTotal", start: 9, end: 10, selectable: true, editable: false },
  { field: "x", start: 11, end: 11, selectable: true, editable: false },
];

const BOTTOM_CELLS: CellDef[] = [
  { field: "grip", start: 0, end: 0, selectable: true, editable: false },
  { field: "code", start: 1, end: 4, selectable: true, editable: true, textSeed: true },
  { field: "qty", start: 5, end: 5, selectable: true, editable: true, numeric: true },
  { field: "unit", start: 6, end: 6, selectable: true, editable: true, numeric: true },
  { field: "price", start: 7, end: 8, selectable: true, editable: true, numeric: true },
  { field: "diskon", start: 9, end: 11, selectable: true, editable: false },
];

const CARD_CELLS = [IMAGE_CELL, ...TOP_CELLS, ...BOTTOM_CELLS];

export function cellsForRow(row: RowRef, layout: ListingLayout): CellDef[] {
  if (row.kind === "header") return headerCells(layout);
  if (row.part === "bottom") return BOTTOM_CELLS;
  return row.image === true ? [IMAGE_CELL, ...TOP_CELLS] : TOP_CELLS;
}

export function selectableCells(row: RowRef, layout: ListingLayout): CellDef[] {
  return cellsForRow(row, layout).filter((cell) => cell.selectable);
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

/** Which half of its card the cursor was standing in when it stepped onto the photo. */
export type ImageSide = "top" | "bottom";

/** A cell the cursor can be sent to: the row, the column to remember, and the cell. */
export type GridTarget = { row: RowRef; col: number; cell: CellDef };

/**
 * The vertical order: header, then each card's top and bottom rows.
 *
 * `hasImage` says which cards draw a photo; those get the extra `image` cell at
 * the start of their top row. Only the cards that have one, so the cursor never
 * lands on a photo that is not drawn.
 */
export function rowsFor(
  cardIds: readonly string[],
  hasImage?: (cardId: string) => boolean,
): RowRef[] {
  return [
    { kind: "header" },
    ...cardIds.flatMap((cardId): RowRef[] => [
      { kind: "card", cardId, part: "top", ...(hasImage?.(cardId) === true ? { image: true } : {}) },
      { kind: "card", cardId, part: "bottom" },
    ]),
  ];
}

/** Which half of a card a field lives in. */
export function partOf(field: Field): "top" | "bottom" {
  if (field === "image") return "top";
  return TOP_CELLS.some((cell) => cell.field === field) ? "top" : "bottom";
}

/** The column a field's cell starts at. */
export function startOf(field: Field): number {
  return CARD_CELLS.find((cell) => cell.field === field)?.start ?? 1;
}

/**
 * The card's top row when it is the one carrying a photo — `undefined` for a card
 * whose goods have no picture, which draws no cell the cursor can reach.
 */
function photoRowOf(rows: readonly RowRef[], cardId: string): RowRef | undefined {
  return rows.find(
    (row) =>
      row.kind === "card" && row.cardId === cardId && row.part === "top" && row.image === true,
  );
}

/**
 * The cell one step horizontally from `selection`, or `undefined` when there is
 * none. `wrap` joins the two ends of the grid — which is what an arrow that ran
 * out of an open editor does — so the key never feels ignored.
 *
 * The walk is row-major, the spreadsheet's reading order, with the photo carved
 * out of it. The photo is one box at column `-1` standing beside *both* rows of
 * its card, so it has three neighbours where the reading order knows of two:
 *
 * - **left out of column 0** — the number on the top row, the handle on the
 *   bottom row — lands on the photo. Row-major alone takes a handle-left up to
 *   the `x` of the row above, stepping over the box that is visibly right there.
 * - **left out of the photo** goes to the row above (its last cell): nothing in
 *   the card sits further left, so the step leaves the card the way it came in.
 * - **right out of the photo** returns to the half of the card it was entered
 *   from (`imageFrom`), the number when nothing says otherwise. The box spans
 *   both rows, so the row that brought the cursor in is the one it expects to
 *   find again.
 *
 * A card with no photo has none of this: its handle's left neighbour stays the
 * `x` of the row above, exactly as the reading order has it.
 */
export function horizontalNeighbour(
  rows: readonly RowRef[],
  selection: Selection,
  layout: ListingLayout,
  delta: number,
  { wrap = false, imageFrom = "top" }: { wrap?: boolean; imageFrom?: ImageSide } = {},
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
  // The photo lives on the card's top row but stands beside both of them, so
  // "does this card have one" is a question about the card, not about the row the
  // cursor happens to be standing in.
  const photoRow = row.kind === "card" ? photoRowOf(rows, row.cardId) : undefined;
  if (photoRow !== undefined && delta < 0 && (cell.field === "no" || cell.field === "grip")) {
    return { row: photoRow, col: startOf("image"), cell: IMAGE_CELL };
  }
  if (cell.field === "image" && row.kind === "card") {
    const cardId = row.cardId;
    if (delta > 0) {
      const part: ImageSide = imageFrom === "bottom" ? "bottom" : "top";
      const field: Field = part === "bottom" ? "grip" : "no";
      const back = rows.find(
        (candidate) =>
          candidate.kind === "card" && candidate.cardId === cardId && candidate.part === part,
      );
      if (back === undefined) return undefined;
      return { row: back, col: startOf(field), cell: cellAt(back, startOf(field), layout) };
    }
    // Left of the photo is the row above: the box is the leftmost cell of its card.
    const above = flat[index - 1] ?? flat[flat.length - 1];
    return above === undefined
      ? undefined
      : { row: above.row, col: above.cell.start, cell: above.cell };
  }

  const next = flat[index + delta] ?? (wrap ? flat[delta < 0 ? flat.length - 1 : 0] : undefined);
  return next === undefined ? undefined : { row: next.row, col: next.cell.start, cell: next.cell };
}
