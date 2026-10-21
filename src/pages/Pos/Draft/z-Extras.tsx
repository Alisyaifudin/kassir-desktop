import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import type Decimal from "decimal.js";
import { AnimatePresence } from "motion/react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kdb";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { generateId } from "~/lib/random";
import { EXTRA_PRESETS, type Extra, type ExtraPreset } from "../mock";
import { recalcExtras } from "~/lib/purchase";
import { rupiah } from "~/pages/_cart/util-rupiah";
import { SELECTED_RING } from "~/pages/_cart/z-Cell";
import { ExtraCard } from "./z-Extra";
import { ExtraSearch } from "./z-ExtraSearch";
import {
  extraCellAt,
  extraColumnIn,
  extraRowsFor,
  sameExtraRow,
  selectableExtraCells,
  startOfExtraField,
  type ExtraField,
  type ExtraRowRef,
  type ExtraSelection,
} from "./extra-grid";

const HEADER: ExtraRowRef = { kind: "header" };
const NAME_COLUMN = 1;
const MANUAL_COLUMN = 8;
const TOGGLE_COLUMN = 10;

/** A blank extra for +manual: a flat amount with nothing filled in. */
function blankExtra(): Extra {
  return { id: generateId(), name: "", kind: "number", value: 0 };
}

function caretAtEnd(input: HTMLInputElement | null): boolean {
  return input !== null && input.selectionStart === input.value.length;
}

/**
 * Stage two: the charges on the purchase as a whole — ongkos kirim, a grosir
 * discount, a rounding-off favour. Same grid as the listing stage: the subtotal
 * sits at the top as a row of its own, then one row per extra, each showing
 * what it works out to, because "3%" is not a number a shopkeeper can check at
 * a glance.
 *
 * Unlike a line's discounts there is no trailing empty row; `+manual` or the
 * search add one, and a purchase with no extras at all is fine. Each row's
 * number is its drag handle, so the extras can be put in any order.
 */
export function Extras({
  extras,
  subtotal,
  rounding,
  onChange,
  onToggle,
  focusSearch,
  focusLast,
  onExitDown,
  focused,
  onActivate,
}: {
  extras: Extra[];
  subtotal: Decimal;
  rounding: number;
  onChange: (extras: Extra[]) => void;
  onToggle: () => void;
  focusSearch: number;
  focusLast: number;
  onExitDown: () => void;
  focused: boolean;
  onActivate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<ExtraSelection>({ row: HEADER, col: NAME_COLUMN });
  const [editing, setEditing] = useState(false);
  const [openKindFor, setOpenKindFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const kindWasOpen = useRef(false);
  // The page-level F1 token; remembers the value seen at mount so switching
  // stages does not steal focus into the new search bar.
  const seenFocusSearch = useRef(focusSearch);
  // The settle strip's hand-off upward; skip the value at mount so a stage
  // switch does not jump the selection.
  const seenFocusLast = useRef(focusLast);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // While the search bar has text the rows make way for the future results.
  const hidden = query.trim() !== "";
  const ids = useMemo(() => extras.map((extra) => extra.id), [extras]);
  const rows = useMemo(() => extraRowsFor(hidden ? [] : ids), [hidden, ids]);
  // The extras are a stack: a percent applies to the running total, so a
  // reorder changes every percent that follows it.
  const effects = useMemo(() => recalcExtras(extras, subtotal), [extras, subtotal]);
  // What the purchase comes to before rounding: the goods, plus every extra.
  const total = effects[effects.length - 1]?.total ?? subtotal;
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return [];
    return EXTRA_PRESETS.filter((preset) => preset.name.toLowerCase().includes(needle));
  }, [query]);

  const active = extraCellAt(selection.row, selection.col);
  const isSearch = selection.row.kind === "header" && active.field === "search";
  const activeId =
    selection.row.kind === "header"
      ? `cell-header-${active.field}`
      : `extra-${selection.row.extraId}-${active.field}`;

  // A row that was deleted or hidden must not keep the selection.
  useEffect(() => {
    if (hidden && selection.row.kind === "extra") {
      setSelection({ row: HEADER, col: NAME_COLUMN });
      setEditing(false);
    }
  }, [hidden, selection.row]);

  // Focus follows the selection; the editing input owns focus itself. Only the
  // panel that owns the selection may take focus.
  useEffect(() => {
    if (!focused) return;
    if (editing) return;
    if (isSearch) searchRef.current?.focus();
    else containerRef.current?.focus();
  }, [selection, editing, isSearch, focused]);

  // F1 is a page-level shortcut: when it fires, put the cursor in the search
  // bar and reset the selection to the header, even out of an edit.
  useEffect(() => {
    if (focusSearch === seenFocusSearch.current) return;
    seenFocusSearch.current = focusSearch;
    setSelection({ row: HEADER, col: NAME_COLUMN });
    setEditing(false);
    const input = searchRef.current;
    input?.focus();
    input?.select();
  }, [focusSearch]);

  // Unified grid: when the settle strip hands off upward, land on the first
  // cell of the last row — the name column.
  useEffect(() => {
    if (focusLast === seenFocusLast.current) return;
    seenFocusLast.current = focusLast;
    const lastRow = rows[rows.length - 1];
    if (lastRow === undefined) return;
    const cells = selectableExtraCells(lastRow);
    const cell = cells[0];
    if (cell === undefined) return;
    setSelection({ row: lastRow, col: cell.start });
    setEditing(false);
    containerRef.current?.focus();
  }, [focusLast, rows]);

  // Radix hands focus back to the trigger when the select closes; take it back
  // for the grid, after Radix's own focus restore has run.
  useEffect(() => {
    if (openKindFor !== null) {
      kindWasOpen.current = true;
      return;
    }
    if (!kindWasOpen.current) return;
    kindWasOpen.current = false;
    const timer = setTimeout(() => containerRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [openKindFor]);

  useEffect(() => {
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function patchExtra(id: string, patch: Partial<Extra>) {
    onChange(extras.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)));
  }

  function selectExtra(extraId: string, field: ExtraField) {
    setSelection({ row: { kind: "extra", extraId }, col: startOfExtraField(field) });
    setEditing(false);
  }

  function startEditExtra(extraId: string, field: ExtraField) {
    setSelection({ row: { kind: "extra", extraId }, col: startOfExtraField(field) });
    setEditing(true);
  }

  function moveVertical(delta: number): boolean {
    const index = rows.findIndex((row) => sameExtraRow(row, selection.row));
    if (index === -1) return false;
    const next = rows[index + delta];
    if (next === undefined) return false;
    const cell = extraCellAt(next, selection.col);
    setSelection({ row: next, col: extraColumnIn(cell, selection.col) });
    setEditing(false);
    return true;
  }

  function moveHorizontal(delta: number) {
    const flat = rows.flatMap((row) => selectableExtraCells(row).map((cell) => ({ row, cell })));
    const index = flat.findIndex(
      (entry) => sameExtraRow(entry.row, selection.row) && entry.cell.field === active.field,
    );
    const next = flat[index + delta];
    if (next === undefined) return;
    setSelection({ row: next.row, col: next.cell.start });
    setEditing(false);
  }

  function append(extra: Extra) {
    onChange([...extras, extra]);
    return extra;
  }

  function insert() {
    const extra = append(blankExtra());
    setSelection({ row: { kind: "extra", extraId: extra.id }, col: NAME_COLUMN });
    setEditing(true);
  }

  /** Add a preset to the draft and drop back into the search field. */
  function addPreset(preset: ExtraPreset) {
    append({ id: generateId(), name: preset.name, kind: preset.kind, value: preset.value });
    setQuery("");
    searchRef.current?.focus();
  }

  function removeExtra(extraId: string) {
    const index = extras.findIndex((extra) => extra.id === extraId);
    const remaining = extras.filter((extra) => extra.id !== extraId);
    setOpenKindFor(null);
    onChange(remaining);
    if (selection.row.kind === "extra" && selection.row.extraId === extraId) {
      const next = remaining[index] ?? remaining[index - 1];
      setSelection(
        next === undefined
          ? { row: HEADER, col: NAME_COLUMN }
          : { row: { kind: "extra", extraId: next.id }, col: NAME_COLUMN },
      );
      setEditing(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    if (over === null || dragged.id === over.id) return;
    const from = extras.findIndex((extra) => extra.id === dragged.id);
    const to = extras.findIndex((extra) => extra.id === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(extras, from, to));
  }

  function activate() {
    if (active.editable) {
      setEditing(true);
      return;
    }
    switch (active.field) {
      case "toggle":
        onToggle();
        return;
      case "manual":
        insert();
        return;
      case "kind":
        if (selection.row.kind === "extra") setOpenKindFor(selection.row.extraId);
        return;
      case "x":
        if (selection.row.kind === "extra") removeExtra(selection.row.extraId);
        return;
      default:
        return; // eff and value-as-display do nothing on their own
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Portaled popups (the kind select) bubble their keys through the React
    // tree, not the DOM; ignore anything that did not start inside this grid.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (editing) return;
    // Ctrl/Cmd+Arrow belongs to the tab switcher; leave the grid selection alone.
    if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;
    switch (event.key) {
      case "ArrowUp":
        if (isSearch) return;
        event.preventDefault();
        moveVertical(-1);
        return;
      case "ArrowDown":
        event.preventDefault();
        if (isSearch && hidden) {
          resultsRef.current?.focus();
          return;
        }
        if (!moveVertical(1)) onExitDown();
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
        if (isSearch) {
          if (hidden && results[0] !== undefined) {
            event.preventDefault();
            addPreset(results[0]);
          }
          return;
        }
        event.preventDefault();
        activate();
        return;
    }
  }

  const manualSelected = selection.row.kind === "header" && active.field === "manual";
  const toggleSelected = selection.row.kind === "header" && active.field === "toggle";
  // A zero subtotal is not worth breaking the button into two lines.
  const showSubtotal = !subtotal.isZero();

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-activedescendant={activeId}
      onKeyDown={handleKeyDown}
      onClickCapture={onActivate}
      onFocusCapture={onActivate}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <div className="grid shrink-0 grid-cols-12 border-b">
        <div
          id="cell-header-search"
          onClick={() => {
            setSelection({ row: HEADER, col: NAME_COLUMN });
            setEditing(false);
          }}
          className={cn("col-span-8 flex items-center gap-2 p-1", focused && isSearch && SELECTED_RING)}
        >
          <Kbd className="py-5 small:py-4">F1</Kbd>
          <Input
            ref={searchRef}
            type="search"
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none placeholder:italic focus-visible:ring-0"
            placeholder="Cari biaya tambahan..."
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
          className={cn("col-span-2 flex items-center border-l p-1", focused && manualSelected && SELECTED_RING)}
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
        <div
          id="cell-header-toggle"
          onClick={() => {
            setSelection({ row: HEADER, col: TOGGLE_COLUMN });
            setEditing(false);
          }}
          className={cn("col-span-2 border-l p-1", focused && toggleSelected && SELECTED_RING)}
        >
          {showSubtotal ? (
            <Button
              variant="ghost"
              className="h-auto w-full flex-col items-start gap-0.5 px-2 py-1"
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
            >
              <span className="flex items-center gap-1 text-small leading-none text-muted-foreground select-none">
                <ArrowLeft className="icon" />
                Produk
              </span>
              <span className="w-full truncate text-normal font-bold tabular-nums">
                {rupiah(subtotal)}
              </span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
            >
              <ArrowLeft />
              Produk
            </Button>
          )}
        </div>
      </div>

      {hidden ? (
        <ExtraSearch
          presets={results}
          containerRef={resultsRef}
          onPick={addPreset}
          onExit={() => searchRef.current?.focus()}
        />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
            {extras.length === 0 ? (
              <p className="p-4 text-muted-foreground select-none">Belum ada biaya tambahan.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {extras.map((extra, index) => {
                        const onRow =
                          selection.row.kind === "extra" && selection.row.extraId === extra.id;
                        const effect = effects[index];
                        if (effect === undefined) return null;
                        return (
                          <ExtraCard
                            key={extra.id}
                            extra={extra}
                            number={index + 1}
                            eff={effect.eff}
                            selected={onRow && focused ? (active.field as ExtraField) : null}
                            editing={onRow && editing}
                            kindOpen={openKindFor === extra.id}
                            onChange={(patch) => patchExtra(extra.id, patch)}
                            onRemove={() => removeExtra(extra.id)}
                            onSelect={(field) => selectExtra(extra.id, field)}
                            onStartEdit={(field) => startEditExtra(extra.id, field)}
                            onEditingDone={() => setEditing(false)}
                            onKindOpenChange={(open) => setOpenKindFor(open ? extra.id : null)}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* No rounding means the settle strip already shows this number, so
              only break the total out when it actually differs. */}
          {rounding === 0 ? null : (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-card px-3 py-2 text-card-foreground">
              <span className="text-normal text-muted-foreground select-none">Total</span>
              <span className="text-big font-bold tabular-nums">{rupiah(total)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
