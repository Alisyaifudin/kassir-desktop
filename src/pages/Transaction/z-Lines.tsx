import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { rupiah } from "~/components/cart/util-rupiah";
import { Cell, SELECTED_RING } from "~/components/cart/z-Cell";
import { cn } from "~/lib/utils";
import type { ManualLine } from "./page";

/**
 * The line grid, navigated the way the Pos and Restock grids are: one tab stop,
 * arrow keys move the selection between cells, Enter opens the editor on the
 * cell under it (or deletes the line when the `x` cell is selected), Escape
 * leaves the editor. Clicking a cell edits it directly.
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
  lines,
  onAdd,
  onChange,
  onRemove,
}: {
  lines: ManualLine[];
  onAdd: () => void;
  onChange: (id: string, next: Partial<ManualLine>) => void;
  onRemove: (id: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Selection>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<Editing | null>(null);

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
      current.row >= lines.length ? { ...current, row: Math.max(0, lines.length - 1) } : current,
    );
  }, [lines.length]);

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

  function doneEditing() {
    setEditing(null);
    focusGrid();
  }

  function add() {
    const row = lines.length;
    onAdd();
    // Select and open the new line so typing can start immediately.
    setSelected({ row, col: 0 });
    setEditing({ row, col: 0 });
  }

  function removeLine(row: number) {
    const line = lines[row];
    if (line === undefined) return;
    onRemove(line.id);
    setEditing(null);
    // The list has not re-rendered yet, so clamp against its next length.
    setSelected({ row: Math.max(0, Math.min(row, lines.length - 2)), col: selected.col });
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
          row: Math.min(lines.length - 1, current.row + 1),
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
            {lines.map((line, index) => {
              const editingName = editing?.row === index && editing.col === 0;
              const editingValue = editing?.row === index && editing.col === 1;
              return (
                <div key={line.id} role="row" className={`${GRID} divide-x`}>
                  <span
                    role="gridcell"
                    className="hidden items-center px-2 text-small text-muted-foreground tabular-nums sm:flex"
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
                    onEditingDone={doneEditing}
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
                    onEditingDone={doneEditing}
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
                    <X aria-hidden="true" className="icon" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-none items-center text-normal justify-end border-t px-2 py-1">
            <Button type="button" onClick={add}>
              <Plus aria-hidden="true" />
              Baris Baru
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
