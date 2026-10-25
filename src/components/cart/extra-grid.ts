/**
 * The extras grid's geometry — the listing grid's rules, one row shorter. A
 * selection keeps a column index and looks up the cell that owns it, so a wide
 * cell (`name`, `subtotal`) behaves like a merged one across rows.
 *
 * Columns are 0-indexed, twelve wide. `no#` is not selectable; `eff` and `x` are
 * selectable but not editable; `dual` is a checkbox cell — selectable, and
 * toggled (Enter or a click) rather than typed into.
 *
 * One grid for both cart screens: `layout` carries the two real differences —
 * the sale screen ends its header with a stage toggle back to the goods, the
 * purchase screen has a `Subtotal Barang` row under the header instead.
 */

export type ExtraField = "name" | "value" | "kind" | "eff" | "dual" | "x";

/** Every cell, including the ones that only draw. */
export type AnyExtraField = ExtraField | "search" | "manual" | "toggle" | "no" | "subtotal";

export type ExtraRowRef =
  | { kind: "header" }
  | { kind: "subtotal" }
  | { kind: "extra"; extraId: string };

export type ExtraSelection = { row: ExtraRowRef; col: number };

export type ExtraCellDef = {
  field: AnyExtraField;
  start: number;
  end: number;
  selectable: boolean;
  editable: boolean;
  /** The cell holds a number: a digit typed while selected opens its editor. */
  numeric?: boolean;
};

/** Which optional pieces the grid has: the stage toggle and the subtotal row. */
export type ExtraLayout = { stageToggle: boolean; subtotalRow: boolean };

/** The sale screen: search, `+manual`, a toggle back to the goods; no subtotal row. */
export const SALE_EXTRA_LAYOUT: ExtraLayout = { stageToggle: true, subtotalRow: false };

/** The purchase screen: search, `+manual`, and the goods subtotal as a row. */
export const PURCHASE_EXTRA_LAYOUT: ExtraLayout = { stageToggle: false, subtotalRow: true };

function headerCells(layout: ExtraLayout): ExtraCellDef[] {
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

const SUBTOTAL_CELLS: ExtraCellDef[] = [
  { field: "subtotal", start: 0, end: 11, selectable: true, editable: false },
];

const EXTRA_CELLS: ExtraCellDef[] = [
  { field: "no", start: 0, end: 0, selectable: false, editable: false },
  { field: "name", start: 1, end: 3, selectable: true, editable: true },
  { field: "value", start: 4, end: 5, selectable: true, editable: true, numeric: true },
  { field: "kind", start: 6, end: 7, selectable: true, editable: false },
  { field: "eff", start: 8, end: 9, selectable: true, editable: false },
  // A checkbox, not a field: `dual` toggles `DUAL_FLAG` on the extra, which is
  // what makes a sale commit the extras-only twin. A preset carries the flag
  // in; this cell is how the cashier corrects it.
  { field: "dual", start: 10, end: 10, selectable: true, editable: false },
  { field: "x", start: 11, end: 11, selectable: true, editable: false },
];

export function extraCellsForRow(row: ExtraRowRef, layout: ExtraLayout): ExtraCellDef[] {
  if (row.kind === "header") return headerCells(layout);
  if (row.kind === "subtotal") return SUBTOTAL_CELLS;
  return EXTRA_CELLS;
}

export function selectableExtraCells(row: ExtraRowRef, layout: ExtraLayout): ExtraCellDef[] {
  return extraCellsForRow(row, layout).filter((cell) => cell.selectable);
}

function distance(cell: ExtraCellDef, col: number): number {
  if (col < cell.start) return cell.start - col;
  if (col > cell.end) return col - cell.end;
  return 0;
}

/** The selectable cell that owns `col`, or the nearest one when none does. */
export function extraCellAt(row: ExtraRowRef, col: number, layout: ExtraLayout): ExtraCellDef {
  const cells = selectableExtraCells(row, layout);
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

/** The vertical order: the header, the optional subtotal row, then each extra. */
export function extraRowsFor(extraIds: string[], layout: ExtraLayout): ExtraRowRef[] {
  return [
    { kind: "header" },
    ...(layout.subtotalRow ? [{ kind: "subtotal" } as ExtraRowRef] : []),
    ...extraIds.map((extraId): ExtraRowRef => ({ kind: "extra", extraId })),
  ];
}

/** The column a field's cell starts at. */
export function startOfExtraField(field: ExtraField): number {
  return EXTRA_CELLS.find((cell) => cell.field === field)?.start ?? 1;
}
