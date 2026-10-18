import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, Reorder } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { generateId } from "~/lib/random";
import type { Line } from "../mock";
import { DiscountDialog, ListingCard } from "./z-ListingCard";
import {
  cellAt,
  columnIn,
  partOf,
  rowsFor,
  sameRow,
  selectableCells,
  startOf,
  type Field,
  type RowRef,
  type Selection,
} from "./listing-grid";

const HEADER: RowRef = { kind: "header" };
const SELECTED_RING = "z-10 ring-1 ring-primary ring-inset";

/** The column a fresh selection remembers when the search bar is the start. */
const NAME_COLUMN = 1;
const MANUAL_COLUMN = 10;

/** A blank line for +manual. No `base`, so there is nothing to undo to. */
function blankLine(): Line {
  return {
    id: generateId(),
    name: "",
    code: "",
    unit: 0,
    price: 0,
    qty: 0,
    discount: 0,
  };
}

function caretAtEnd(input: HTMLInputElement | null): boolean {
  return input !== null && input.selectionStart === input.value.length;
}

/**
 * Stage one: choosing what is being bought. The search bar and `+manual` stay
 * pinned to the top; the lines below scroll, newest on top and numbered from
 * the bottom.
 *
 * The whole grid is keyboard-driven: a `(row, column)` selection moves with the
 * arrows, keeps its column across rows (so a wide cell acts like a merged one),
 * and only enters edit mode on Enter or a double-click. See `listing-grid.ts`
 * for the geometry.
 *
 * Listings are still mocked — the rows live in the panel's state and nothing is
 * written to `tx_listings` yet.
 */
export function Listing({ lines, onChange }: { lines: Line[]; onChange: (lines: Line[]) => void }) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>({ row: HEADER, col: NAME_COLUMN });
  const [editing, setEditing] = useState(false);
  const [discountFor, setDiscountFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // While the search bar has text the cards make way for the future results.
  const hidden = query.trim() !== "";
  const ids = useMemo(() => lines.map((line) => line.id), [lines]);
  const rows = useMemo(() => rowsFor(hidden ? [] : ids), [hidden, ids]);

  const active = cellAt(selection.row, selection.col);
  const isSearch = selection.row.kind === "header" && active.field === "search";
  const activeId =
    selection.row.kind === "header"
      ? `cell-header-${active.field}`
      : `cell-${selection.row.cardId}-${active.field}`;

  // A card that was deleted or hidden must not keep the selection.
  useEffect(() => {
    if (hidden && selection.row.kind === "card") {
      setSelection({ row: HEADER, col: NAME_COLUMN });
      setEditing(false);
    }
  }, [hidden, selection.row]);

  // Focus follows the selection; the editing input owns focus itself.
  useEffect(() => {
    if (editing) return;
    if (isSearch) searchRef.current?.focus();
    else containerRef.current?.focus();
  }, [selection, editing, isSearch]);

  useEffect(() => {
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function moveVertical(delta: number) {
    const index = rows.findIndex((row) => sameRow(row, selection.row));
    if (index === -1) return;
    const next = rows[index + delta];
    if (next === undefined) return;
    const col = next.kind === "card" && selection.col === 0 ? NAME_COLUMN : selection.col;
    const cell = cellAt(next, col);
    setSelection({ row: next, col: columnIn(cell, col) });
    setEditing(false);
  }

  function moveHorizontal(delta: number) {
    const flat = rows.flatMap((row) => selectableCells(row).map((cell) => ({ row, cell })));
    const index = flat.findIndex(
      (entry) => sameRow(entry.row, selection.row) && entry.cell.field === active.field,
    );
    const next = flat[index + delta];
    if (next === undefined) return;
    setSelection({ row: next.row, col: next.cell.start });
    setEditing(false);
  }

  function insert() {
    const line = blankLine();
    onChange([line, ...lines]);
    setSelection({ row: { kind: "card", cardId: line.id, part: "top" }, col: NAME_COLUMN });
    setEditing(false);
  }

  function removeCard(cardId: string) {
    const index = lines.findIndex((line) => line.id === cardId);
    const remaining = lines.filter((line) => line.id !== cardId);
    onChange(remaining);
    if (selection.row.kind === "card" && selection.row.cardId === cardId) {
      const next = remaining[index] ?? remaining[index - 1];
      setSelection(
        next === undefined
          ? { row: HEADER, col: NAME_COLUMN }
          : { row: { kind: "card", cardId: next.id, part: "top" }, col: NAME_COLUMN },
      );
      setEditing(false);
    }
  }

  function activate() {
    if (active.editable) {
      setEditing(true);
      return;
    }
    switch (active.field) {
      case "manual":
        insert();
        return;
      case "x":
        if (selection.row.kind === "card") removeCard(selection.row.cardId);
        return;
      case "diskon":
        if (selection.row.kind === "card") setDiscountFor(selection.row.cardId);
        return;
      default:
        return; // subtotal is selectable but does nothing
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    switch (event.key) {
      case "ArrowUp":
        if (isSearch) return;
        event.preventDefault();
        moveVertical(-1);
        return;
      case "ArrowDown":
        event.preventDefault();
        moveVertical(1);
        return;
      case "ArrowLeft":
        if (isSearch) return;
        event.preventDefault();
        moveHorizontal(-1);
        return;
      case "ArrowRight":
        if (isSearch && !caretAtEnd(searchRef.current)) return;
        event.preventDefault();
        moveHorizontal(1);
        return;
      case "Enter":
        if (isSearch) return;
        event.preventDefault();
        activate();
        return;
    }
  }

  const manualSelected = selection.row.kind === "header" && active.field === "manual";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-activedescendant={activeId}
      onKeyDown={handleKeyDown}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <div className="grid shrink-0 grid-cols-12 border-b">
        <div
          id="cell-header-search"
          onClick={() => {
            setSelection({ row: HEADER, col: NAME_COLUMN });
            setEditing(false);
          }}
          className={cn("col-span-10 p-1", isSearch && SELECTED_RING)}
        >
          <Input
            ref={searchRef}
            type="search"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="Cari barang untuk dibeli..."
            aria-autocomplete="list"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </div>
        <div
          id="cell-header-manual"
          onClick={() => {
            setSelection({ row: HEADER, col: MANUAL_COLUMN });
            setEditing(false);
          }}
          className={cn("col-span-2 border-l p-1", manualSelected && SELECTED_RING)}
        >
          <Button
            variant="ghost"
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              insert();
            }}
          >
            <Plus className="icon" />
            Manual
          </Button>
        </div>
      </div>

      {!hidden ? (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
          <Reorder.Group
            axis="y"
            values={ids}
            onReorder={(next) => {
              const byId = new Map(lines.map((line) => [line.id, line]));
              onChange(next.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])));
            }}
            className="divide-y divide-border"
          >
            <AnimatePresence initial={false}>
              {lines.map((line, index) => {
                const cardSelected =
                  selection.row.kind === "card" && selection.row.cardId === line.id;
                return (
                  <ListingCard
                    key={line.id}
                    line={line}
                    number={lines.length - index}
                    selected={cardSelected ? (active.field as Field) : null}
                    editing={cardSelected && editing}
                    onChange={(patch) =>
                      onChange(lines.map((row) => (row.id === line.id ? { ...row, ...patch } : row)))
                    }
                    onRemove={() => removeCard(line.id)}
                    onDiscount={() => setDiscountFor(line.id)}
                    onSelect={(field) => {
                      setSelection({
                        row: { kind: "card", cardId: line.id, part: partOf(field) },
                        col: startOf(field),
                      });
                      setEditing(false);
                    }}
                    onStartEdit={(field) => {
                      setSelection({
                        row: { kind: "card", cardId: line.id, part: partOf(field) },
                        col: startOf(field),
                      });
                      setEditing(true);
                    }}
                    onEditingDone={() => setEditing(false)}
                  />
                );
              })}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      ) : null}

      <DiscountDialog
        open={discountFor !== null}
        onOpenChange={(open) => {
          if (!open) setDiscountFor(null);
        }}
      />
    </div>
  );
}
