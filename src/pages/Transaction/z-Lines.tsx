import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { rupiah } from "~/components/cart/util-rupiah";
import { Cell, SELECTED_RING } from "~/components/cart/z-Cell";
import { cn } from "~/lib/utils";
import type { DraftExtra } from "~/services/transaction";
import { Kbd } from "~/components/ui/kdb";

/**
 * The line grid, navigated the way the Pos and Restock grids are: one tab stop,
 * arrow keys move the selection between cells, Enter opens the editor on the
 * cell under it (or deletes the line when the `x` cell is selected), Escape
 * leaves the editor. Clicking a cell edits it directly.
 *
 * While a cell is open, Tab walks the editable cells in reading order —
 * nama → nilai → the next line's nama — and wraps at either end, so the grid
 * never hands the keyboard to the browser mid-record. Shift+Tab is the reverse.
 * F2 appends a line and puts the cursor in its name wherever the keyboard is,
 * the way Pos uses its function keys.
 *
 * Columns are 0-indexed: `0` nama, `1` nilai, `2` hapus. The number column only
 * draws.
 */
type Col = 0 | 1 | 2;

type Selection = { row: number; col: Col };
type Editing = { row: number; col: 0 | 1 };

const GRID =
  "grid items-stretch grid-cols-[minmax(0,1fr)_160px_48px] sm:grid-cols-[64px_minmax(0,1fr)_240px_56px]";

const COLUMNS = 3;

export function Lines({
  extras,
  onAdd,
  onChange,
  onRemove,
}: {
  /** The active tab's extras; a line is one of kind `number`. */
  extras: DraftExtra[];
  onAdd: () => void;
  onChange: (id: string, next: Partial<DraftExtra>) => void;
  onRemove: (id: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selection>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<Editing | null>(null);
  // Tab moves the editor from one cell to the next in the same tick; the editor
  // that closes must not clear the one that just opened (or refocus the grid).
  const editingRef = useRef<Editing | null>(null);
  editingRef.current = editing;

  const cellId = (row: number, col: Col) => `transaction-cell-${row}-${col}`;
  const editId = (row: number, col: 0 | 1) => `transaction-edit-${row}-${col}`;
  const activeId = cellId(selected.row, selected.col);

  // The grid is the screen's working surface: it takes the keyboard on arrival.
  useEffect(() => {
    gridRef.current?.focus();
  }, []);

  // A line removed under the selection must not leave it pointing past the end.
  useEffect(() => {
    setSelected((current) =>
      current.row >= extras.length ? { ...current, row: Math.max(0, extras.length - 1) } : current,
    );
  }, [extras.length]);

  // Enter can open an editor in the same tick the last one closed; focusing the
  // field here (after the cell has mounted it) is what keeps the keystrokes
  // going into the editor instead of the grid.
  useEffect(() => {
    if (editing === null) return;
    document.getElementById(editId(editing.row, editing.col))?.focus();
  }, [editing]);

  // `aria-activedescendant` is not a focus target, so the browser does not
  // scroll it into view; keep the selected cell visible by hand.
  useEffect(() => {
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function focusGrid() {
    gridRef.current?.focus();
  }

  function select(row: number, col: Col) {
    setSelected({ row, col });
    focusGrid();
  }

  function startEdit(row: number, col: 0 | 1) {
    setSelected({ row, col });
    setEditing({ row, col });
  }

  function doneEditing(row: number, col: 0 | 1) {
    const current = editingRef.current;
    if (current === null || current.row !== row || current.col !== col) return;
    setEditing(null);
    focusGrid();
  }

  /** Tab inside an editor: nama → nilai → next nama, wrapping at both ends. */
  function moveTab(row: number, col: 0 | 1, back: boolean) {
    if (!back) {
      if (col === 0) startEdit(row, 1);
      else startEdit(row + 1 < extras.length ? row + 1 : 0, 0);
      return;
    }
    if (col === 1) startEdit(row, 0);
    else startEdit(row - 1 >= 0 ? row - 1 : extras.length - 1, 1);
  }

  function add() {
    const row = extras.length;
    onAdd();
    // Select and open the new line so typing can start immediately.
    setSelected({ row, col: 0 });
    setEditing({ row, col: 0 });
  }

  // The listener lives on `window`, so it must not capture an `add` that still
  // remembers an older line count.
  const addRef = useRef(add);
  addRef.current = add;

  // F2: append a line and put the cursor in its name, from anywhere on the
  // screen. A dialog owns the keyboard while it is open, so the shortcut waits.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "F1" || isScreenOwnedByDialog()) return;
      event.preventDefault();
      addRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function removeLine(row: number) {
    const line = extras[row];
    if (line === undefined) return;
    onRemove(line.id);
    setEditing(null);
    // The list has not re-rendered yet, so clamp against its next length.
    setSelected({ row: Math.max(0, Math.min(row, extras.length - 2)), col: selected.col });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (editing !== null) return;
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.defaultPrevented) return;
    if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        setSelected((current) => ({ ...current, row: Math.max(0, current.row - 1) }));
        return;
      case "ArrowDown":
        event.preventDefault();
        setSelected((current) => ({
          ...current,
          row: Math.min(extras.length - 1, current.row + 1),
        }));
        return;
      case "ArrowLeft":
        event.preventDefault();
        setSelected((current) => ({
          ...current,
          col: Math.max(0, current.col - 1) as Col,
        }));
        return;
      case "ArrowRight":
        event.preventDefault();
        setSelected((current) => ({
          ...current,
          col: Math.min(COLUMNS - 1, current.col + 1) as Col,
        }));
        return;
      case "Enter":
        event.preventDefault();
        if (selected.col === 2) removeLine(selected.row);
        else startEdit(selected.row, selected.col);
        return;
      default:
        return;
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border">
        <div
          ref={gridRef}
          role="grid"
          aria-label="Baris transaksi"
          aria-activedescendant={activeId}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="min-h-0 flex-1 overflow-y-auto outline-none"
        >
          <div className="flex flex-col divide-y">
            {extras.map((line, index) => {
              const editingName = editing?.row === index && editing.col === 0;
              const editingValue = editing?.row === index && editing.col === 1;
              return (
                <div key={line.id} role="row" className={`${GRID} divide-x`}>
                  <span
                    role="gridcell"
                    className="hidden items-center px-2 text-sm text-muted-foreground tabular-nums sm:flex"
                  >
                    {index + 1}
                  </span>

                  <Cell
                    id={cellId(index, 0)}
                    className="min-w-0"
                    label="Nama"
                    ariaLabel={`Nama baris ${index + 1}`}
                    editId={editId(index, 0)}
                    selected={selected.row === index && selected.col === 0}
                    editing={editingName}
                    value={line.name}
                    display={line.name}
                    empty={line.name === ""}
                    placeholder="Nama transaksi"
                    singleClickEdit
                    onSelect={() => select(index, 0)}
                    onStartEdit={() => startEdit(index, 0)}
                    onEditingDone={() => doneEditing(index, 0)}
                    onEditKeyDown={(event) => {
                      if (event.key !== "Tab") return false;
                      event.preventDefault();
                      moveTab(index, 0, event.shiftKey);
                      return true;
                    }}
                    onChange={(raw) => onChange(line.id, { name: raw })}
                    onCommit={(raw) => onChange(line.id, { name: raw })}
                  />

                  <Cell
                    id={cellId(index, 1)}
                    label="Nilai"
                    ariaLabel={`Nilai baris ${index + 1}`}
                    editId={editId(index, 1)}
                    align="right"
                    selected={selected.row === index && selected.col === 1}
                    editing={editingValue}
                    currency
                    allowNegative
                    value={line.value}
                    display={rupiah(line.value)}
                    empty={line.value === 0}
                    placeholder="Rp0"
                    singleClickEdit
                    onSelect={() => select(index, 1)}
                    onStartEdit={() => startEdit(index, 1)}
                    onEditingDone={() => doneEditing(index, 1)}
                    onEditKeyDown={(event) => {
                      if (event.key !== "Tab") return false;
                      event.preventDefault();
                      moveTab(index, 1, event.shiftKey);
                      return true;
                    }}
                    onChange={(raw) => onChange(line.id, { value: Number(raw) || 0 })}
                    onCommit={(raw) => onChange(line.id, { value: Number(raw) || 0 })}
                  />

                  <div
                    role="gridcell"
                    id={cellId(index, 2)}
                    aria-selected={selected.row === index && selected.col === 2}
                    aria-label={`Hapus baris ${index + 1}`}
                    title="Hapus baris"
                    className={cn(
                      "flex cursor-pointer items-center justify-center text-muted-foreground hover:text-destructive",
                      selected.row === index && selected.col === 2 && SELECTED_RING,
                    )}
                    onClick={() => {
                      setSelected({ row: index, col: 2 });
                      removeLine(index);
                    }}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-none items-center text-base justify-end border-t px-2 py-1">
            <Button type="button" onClick={add}>
              <Plus aria-hidden="true" />
              Baris Baru
              <Kbd>F1</Kbd>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
