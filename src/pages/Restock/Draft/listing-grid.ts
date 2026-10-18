/**
 * The listing grid's geometry. Navigation keeps a column index and looks up the
 * cell that owns it, so a wide cell (`nama`, `grandTotal`, `diskon`) behaves like
 * a merged cell in a spreadsheet: moving up from `kuantitas` (col 5) lands in
 * `nama`, and moving up again uses the remembered column to land in the next
 * card's `kuantitas`.
 *
 * Columns are 0-indexed, twelve wide. `x` is selectable but not editable; `no#`
 * and the drag handle are not selectable.
 */

export type Field = "name" | "grandTotal" | "x" | "code" | "qty" | "unit" | "price" | "diskon";

/** Every cell, including the ones that only draw. */
export type AnyField = Field | "search" | "manual" | "no" | "grip";

export type RowRef =
  | { kind: "header" }
  | { kind: "card"; cardId: string; part: "top" | "bottom" };

export type Selection = { row: RowRef; col: number };

export type CellDef = {
  field: AnyField;
  start: number;
  end: number;
  selectable: boolean;
  editable: boolean;
};

const HEADER_CELLS: CellDef[] = [
  { field: "search", start: 0, end: 9, selectable: true, editable: true },
  { field: "manual", start: 10, end: 11, selectable: true, editable: false },
];

const TOP_CELLS: CellDef[] = [
  { field: "no", start: 0, end: 0, selectable: false, editable: false },
  { field: "name", start: 1, end: 8, selectable: true, editable: true },
  { field: "grandTotal", start: 9, end: 10, selectable: true, editable: false },
  { field: "x", start: 11, end: 11, selectable: true, editable: false },
];

const BOTTOM_CELLS: CellDef[] = [
  { field: "grip", start: 0, end: 0, selectable: false, editable: false },
  { field: "code", start: 1, end: 4, selectable: true, editable: true },
  { field: "qty", start: 5, end: 5, selectable: true, editable: true },
  { field: "unit", start: 6, end: 6, selectable: true, editable: true },
  { field: "price", start: 7, end: 8, selectable: true, editable: true },
  { field: "diskon", start: 9, end: 11, selectable: true, editable: false },
];

const CARD_CELLS = [...TOP_CELLS, ...BOTTOM_CELLS];

export function cellsForRow(row: RowRef): CellDef[] {
  if (row.kind === "header") return HEADER_CELLS;
  return row.part === "top" ? TOP_CELLS : BOTTOM_CELLS;
}

export function selectableCells(row: RowRef): CellDef[] {
  return cellsForRow(row).filter((cell) => cell.selectable);
}

function distance(cell: CellDef, col: number): number {
  if (col < cell.start) return cell.start - col;
  if (col > cell.end) return col - cell.end;
  return 0;
}

/** The selectable cell that owns `col`, or the nearest one when none does. */
export function cellAt(row: RowRef, col: number): CellDef {
  const cells = selectableCells(row);
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

/** The vertical order: header, then each card's top and bottom rows. */
export function rowsFor(cardIds: string[]): RowRef[] {
  return [
    { kind: "header" },
    ...cardIds.flatMap((cardId): RowRef[] => [
      { kind: "card", cardId, part: "top" },
      { kind: "card", cardId, part: "bottom" },
    ]),
  ];
}

/** Which half of a card a field lives in. */
export function partOf(field: Field): "top" | "bottom" {
  return TOP_CELLS.some((cell) => cell.field === field) ? "top" : "bottom";
}

/** The column a field's cell starts at. */
export function startOf(field: Field): number {
  return CARD_CELLS.find((cell) => cell.field === field)?.start ?? 1;
}
