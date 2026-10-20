/**
 * The extras grid's geometry — the listing grid's rules, one row shorter. A
 * selection keeps a column index and looks up the cell that owns it, so a wide
 * cell (`name`) behaves like a merged one across rows.
 *
 * Columns are 0-indexed, twelve wide. `no#` is not selectable, `eff` and `x`
 * are selectable but not editable.
 */

export type ExtraField = "name" | "value" | "kind" | "eff" | "x";

/** Every cell, including the ones that only draw. */
export type AnyExtraField = ExtraField | "search" | "manual" | "toggle" | "no";

export type ExtraRowRef = { kind: "header" } | { kind: "extra"; extraId: string };

export type ExtraSelection = { row: ExtraRowRef; col: number };

export type ExtraCellDef = {
  field: AnyExtraField;
  start: number;
  end: number;
  selectable: boolean;
  editable: boolean;
};

const HEADER_CELLS: ExtraCellDef[] = [
  { field: "search", start: 0, end: 7, selectable: true, editable: true },
  { field: "manual", start: 8, end: 9, selectable: true, editable: false },
  { field: "toggle", start: 10, end: 11, selectable: true, editable: false },
];

const EXTRA_CELLS: ExtraCellDef[] = [
  { field: "no", start: 0, end: 0, selectable: false, editable: false },
  { field: "name", start: 1, end: 3, selectable: true, editable: true },
  { field: "value", start: 4, end: 6, selectable: true, editable: true },
  { field: "kind", start: 7, end: 8, selectable: true, editable: false },
  { field: "eff", start: 9, end: 10, selectable: true, editable: false },
  { field: "x", start: 11, end: 11, selectable: true, editable: false },
];

export function extraCellsForRow(row: ExtraRowRef): ExtraCellDef[] {
  return row.kind === "header" ? HEADER_CELLS : EXTRA_CELLS;
}

export function selectableExtraCells(row: ExtraRowRef): ExtraCellDef[] {
  return extraCellsForRow(row).filter((cell) => cell.selectable);
}

function distance(cell: ExtraCellDef, col: number): number {
  if (col < cell.start) return cell.start - col;
  if (col > cell.end) return col - cell.end;
  return 0;
}

/** The selectable cell that owns `col`, or the nearest one when none does. */
export function extraCellAt(row: ExtraRowRef, col: number): ExtraCellDef {
  const cells = selectableExtraCells(row);
  const hit = cells.find((cell) => col >= cell.start && col <= cell.end);
  if (hit !== undefined) return hit;
  return cells.reduce((best, cell) => (distance(cell, col) < distance(best, col) ? cell : best));
}

/** The column to remember when moving into `cell` from `col`. */
export function extraColumnIn(cell: ExtraCellDef, col: number): number {
  return Math.min(Math.max(col, cell.start), cell.end);
}

export function sameExtraRow(a: ExtraRowRef, b: ExtraRowRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "extra" && b.kind === "extra") return a.extraId === b.extraId;
  return true;
}

/** The vertical order: the header, then each extra. */
export function extraRowsFor(extraIds: string[]): ExtraRowRef[] {
  return [{ kind: "header" }, ...extraIds.map((extraId): ExtraRowRef => ({ kind: "extra", extraId }))];
}

/** The column a field's cell starts at. */
export function startOfExtraField(field: ExtraField): number {
  return EXTRA_CELLS.find((cell) => cell.field === field)?.start ?? 1;
}
