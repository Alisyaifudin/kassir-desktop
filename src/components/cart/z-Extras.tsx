import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useDebounce } from "use-debounce";
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
import { Skeleton } from "~/components/ui/skeleton";
import { ReservedSkeleton } from "~/components/page-data";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { generateId } from "~/lib/random";
import { type Extra, type ExtraPreset } from "~/components/cart/types";
import { DUAL_FLAG, SEARCH_DELAY } from "~/lib/constants";
import { useExtraPresets } from "~/components/cart/use-extra-presets";
import { recalcExtras } from "~/lib/purchase";
import { rupiah } from "~/components/cart/util-rupiah";
import { SELECTED_RING, typedDigit } from "~/components/cart/z-Cell";
import { ExtraCard } from "~/components/cart/z-Extra";
import { ExtraSearch } from "~/components/cart/z-ExtraSearch";
import {
  PURCHASE_EXTRA_LAYOUT,
  SALE_EXTRA_LAYOUT,
  extraCellAt,
  extraColumnIn,
  extraRowsFor,
  sameExtraRow,
  selectableExtraCells,
  startOfExtraField,
  type ExtraField,
  type ExtraRowRef,
  type ExtraSelection,
} from "~/components/cart/extra-grid";

const HEADER: ExtraRowRef = { kind: "header" };
const SUBTOTAL_ROW: ExtraRowRef = { kind: "subtotal" };
const NAME_COLUMN = 1;

/** A blank extra for +manual: a flat amount with nothing filled in, no flags. */
function blankExtra(): Extra {
  return { id: generateId(), name: "", kind: "number", value: 0, flag: 0 };
}

function caretAtEnd(input: HTMLInputElement | null): boolean {
  return input !== null && input.selectionStart === input.value.length;
}

/**
 * The catalog presets whose name contains the query. Pulled out of the render
 * so Enter can match the text that is on screen *now* — before the debounce has
 * settled — instead of picking from the list the previous query left behind.
 */
function matchPresets(presets: readonly ExtraPreset[], query: string): ExtraPreset[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return presets.filter((preset) => preset.name.toLowerCase().includes(needle));
}

/**
 * Stage two of both carts: the charges on the record as a whole — ongkos kirim,
 * a grosir discount, a rounding-off favour. Same grid as the listing stage: the
 * subtotal sits at the top as a row of its own (a purchase) or the header ends in
 * a toggle back to the goods with the total on it (a sale), then one row per
 * extra, each showing what it works out to, because "3%" is not a number a
 * shopkeeper can check at a glance.
 *
 * Unlike a line's discounts there is no trailing empty row; `+manual` or the
 * search add one, and a record with no extras at all is fine. Each row's number
 * is its drag handle, so the extras can be put in any order, and each row's
 * `dual` checkbox sets the `DUAL_FLAG` that makes the sale book the extras-only
 * twin — a preset brings the flag in, the checkbox is how it is corrected.
 *
 * One component for both screens: `mode` picks the grid layout and the wording,
 * and the settle-strip props (`focusLast`, `onExitDown`, `focused`, `onActivate`,
 * `rounding`) are absent on the purchase screen, which has no sibling panel to
 * hand focus to.
 */
export function Extras({
  mode,
  extras,
  subtotal,
  rounding = 0,
  onChange,
  onToggle,
  focusSearch,
  focusLast,
  onExitDown,
  focused = true,
  onActivate,
  presets: presetOverride,
  loading = false,
}: {
  mode: "sale" | "purchase";
  extras: Extra[];
  /** The draft is still being read: hold three row places under the header. */
  loading?: boolean;
  /**
   * The extras catalog. A screen with a page-level registry passes its own key
   * (so it loads beside the drafts); without it the screen reads the stream.
   */
  presets?: ExtraPreset[];
  subtotal: Decimal;
  /** The record's rounding, drawn on the sale's stage toggle when it is not zero. */
  rounding?: number;
  onChange: (extras: Extra[]) => void;
  /** Back to the goods; present on a sale, where the stages are siblings. */
  onToggle?: () => void;
  focusSearch: number;
  /** The settle strip's hand-off upward; a sale-only token. */
  focusLast?: number;
  /** ArrowDown off the last row; the sale hands the selection to the settle strip. */
  onExitDown?: () => void;
  /** Whether this panel owns the selection — only the owner may take focus. */
  focused?: boolean;
  onActivate?: () => void;
}) {
  const layout = mode === "sale" ? SALE_EXTRA_LAYOUT : PURCHASE_EXTRA_LAYOUT;
  // What the field shows, and the value the preset list filters on. The filter
  // waits for the pause (see `SEARCH_DELAY`): narrowing the list between keys
  // painted a half-word's answer and rebuilt it per keystroke.
  const [input, setInput] = useState("");
  const [query, flushQuery] = useDebounce(input, SEARCH_DELAY);
  // `typedText`, not `typed`: the key handlers declare their own `typed` for the
  // digit a keystroke stands for, and a shadowed name here would compare that.
  const typedText = input.trim();
  const [selection, setSelection] = useState<ExtraSelection>({ row: HEADER, col: NAME_COLUMN });
  const [editing, setEditing] = useState(false);
  // The digit that opened the editor, if a keystroke did (see `typedDigit`).
  const [seed, setSeed] = useState<string | null>(null);
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

  // The pane only takes over once the list has been narrowed to the text on
  // screen — typing must not blank the rows for a list that is still the previous
  // query's. Once it is up it stays up while there is text, so a longer query
  // does not flash the rows back between keystrokes.
  const settled = typedText !== "" && typedText === query.trim();
  const [pane, setPane] = useState(false);
  useEffect(() => {
    if (typedText === "") setPane(false);
    else if (settled) setPane(true);
  }, [typedText, settled]);
  // An empty bar is never covered — not even for the render before the effect
  // above notices, which is the render a pick returns the bar in.
  const shown = typedText !== "" && pane;
  // ArrowDown empties the bar into the list before the list exists; the focus
  // lands the moment it is painted.
  const wantListFocus = useRef(false);
  const ids = useMemo(() => extras.map((extra) => extra.id), [extras]);
  const rows = useMemo(() => extraRowsFor(shown ? [] : ids, layout), [shown, ids, layout]);
  // The extras are a stack: a percent applies to the running total, so a
  // reorder changes every percent that follows it.
  const effects = useMemo(() => recalcExtras(extras, subtotal), [extras, subtotal]);
  // What the record comes to before rounding: the goods, plus every extra.
  const total = effects[effects.length - 1]?.total ?? subtotal;
  // The extras catalog, live: the Extra page writes to the same service, so a
  // new or re-priced extra is searchable here without a reload.
  const livePresets = useExtraPresets();
  const presets = presetOverride ?? livePresets;
  const results = useMemo(() => matchPresets(presets, query), [presets, query]);

  const active = extraCellAt(selection.row, selection.col, layout);
  const isSearch = selection.row.kind === "header" && active.field === "search";
  const activeId =
    selection.row.kind === "header"
      ? `cell-header-${active.field}`
      : selection.row.kind === "subtotal"
        ? "cell-subtotal-subtotal"
        : `extra-${selection.row.extraId}-${active.field}`;

  // A row that was deleted or covered by the results must not keep the selection.
  useEffect(() => {
    if (shown && selection.row.kind === "extra") {
      setSelection({ row: HEADER, col: NAME_COLUMN });
      setEditing(false);
    }
  }, [shown, selection.row]);

  // A deferred ArrowDown focus: the list is painted, so take the keys into it.
  useEffect(() => {
    if (!shown || !wantListFocus.current) return;
    const list = resultsRef.current;
    if (list === null) return;
    wantListFocus.current = false;
    list.focus();
  }, [shown, results]);

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
    const field = searchRef.current;
    field?.focus();
    field?.select();
  }, [focusSearch]);

  // Unified grid: when the settle strip hands off upward, land on the first
  // cell of the last row — the name column.
  useEffect(() => {
    if (focusLast === undefined || focusLast === seenFocusLast.current) return;
    seenFocusLast.current = focusLast;
    const lastRow = rows[rows.length - 1];
    if (lastRow === undefined) return;
    const cells = selectableExtraCells(lastRow, layout);
    const cell = cells[0];
    if (cell === undefined) return;
    setSelection({ row: lastRow, col: cell.start });
    setEditing(false);
    containerRef.current?.focus();
  }, [focusLast, rows, layout]);

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
    setSelection({ row: { kind: "extra", extraId }, col: startOfExtraField(field, layout) });
    setEditing(false);
  }

  function startEditExtra(extraId: string, field: ExtraField) {
    setSelection({ row: { kind: "extra", extraId }, col: startOfExtraField(field, layout) });
    setSeed(null);
    setEditing(true);
  }

  function moveVertical(delta: number): boolean {
    const index = rows.findIndex((row) => sameExtraRow(row, selection.row));
    if (index === -1) return false;
    const next = rows[index + delta];
    if (next === undefined) return false;
    const cell = extraCellAt(next, selection.col, layout);
    setSelection({ row: next, col: extraColumnIn(cell, selection.col) });
    setEditing(false);
    return true;
  }

  function moveHorizontal(delta: number) {
    const flat = rows.flatMap((row) =>
      selectableExtraCells(row, layout).map((cell) => ({ row, cell })),
    );
    const index = flat.findIndex(
      (entry) => sameExtraRow(entry.row, selection.row) && entry.cell.field === active.field,
    );
    const next = flat[index + delta];
    if (next === undefined) return;
    setSelection({ row: next.row, col: next.cell.start });
    setEditing(false);
  }

  // Always append to the freshest list the prop hands us; two writers in one
  // dispatch must not overwrite each other's row.
  function append(extra: Extra) {
    onChange([...extras, extra]);
    return extra;
  }

  function insert() {
    const extra = append(blankExtra());
    setSelection({ row: { kind: "extra", extraId: extra.id }, col: NAME_COLUMN });
    setEditing(true);
  }

  /** Add a chosen extra to the draft and drop back into the search field. */
  function addPreset(preset: ExtraPreset) {
    // The flags travel with the name: `dual` is what makes the sale commit an
    // extras-only twin, and it is not something the cashier retypes.
    append({
      id: generateId(),
      name: preset.name,
      kind: preset.kind,
      value: preset.value,
      flag: preset.flag,
    });
    setInput("");
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
          ? layout.subtotalRow
            ? { row: SUBTOTAL_ROW, col: 0 }
            : { row: HEADER, col: NAME_COLUMN }
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
      setSeed(null);
      setEditing(true);
      return;
    }
    switch (active.field) {
      case "toggle":
        onToggle?.();
        return;
      case "manual":
        insert();
        return;
      case "kind":
        if (selection.row.kind === "extra") setOpenKindFor(selection.row.extraId);
        return;
      case "dual": {
        const row = selection.row;
        if (row.kind !== "extra") return;
        const extra = extras.find((item) => item.id === row.extraId);
        if (extra !== undefined) patchExtra(extra.id, { flag: extra.flag ^ DUAL_FLAG });
        return;
      }
      case "x":
        if (selection.row.kind === "extra") removeExtra(selection.row.extraId);
        return;
      default:
        return; // the subtotal, eff and value-as-display do nothing on their own
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Portaled popups (the kind select) bubble their keys through the React
    // tree, not the DOM; ignore anything that did not start inside this grid.
    if (!event.currentTarget.contains(event.target as Node)) return;
    // The preset list lives inside this container; do not also move the grid
    // selection for keys it already handled (Enter picks the highlighted preset).
    if (event.defaultPrevented) return;
    if (editing) return;
    // Ctrl/Cmd+Arrow belongs to the tab switcher; leave the grid selection alone.
    if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;
    // A digit on a selected `Nilai` cell opens its editor with that digit, so the
    // value is replaced rather than appended to.
    const typed = active.numeric === true ? typedDigit(event) : null;
    if (typed !== null) {
      event.preventDefault();
      setSeed(typed);
      setEditing(true);
      return;
    }
    switch (event.key) {
      case "ArrowUp":
        if (isSearch) return;
        event.preventDefault();
        moveVertical(-1);
        return;
      case "ArrowDown":
        event.preventDefault();
        if (isSearch && typedText !== "") {
          // Land on this query's list, not on the one the last pause left on
          // screen: Enter in the list picks what the list highlights. The list is
          // painted once the flush has filtered it, which is the same tick here —
          // so the focus is taken then.
          flushQuery.flush();
          if (resultsRef.current !== null) resultsRef.current.focus();
          else wantListFocus.current = true;
          return;
        }
        if (!moveVertical(1)) onExitDown?.();
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
          // Enter in the grid only adds the first preset when the list itself is
          // not focused; focused-list Enter is handled (and consumed) by
          // ExtraSearch, which knows which preset is highlighted.
          if (typedText !== "" && !resultsRef.current?.contains(document.activeElement)) {
            // Enter before the pause: match once, now, instead of picking from
            // the list the previous query left on screen.
            const first = matchPresets(presets, input)[0];
            if (first !== undefined) {
              event.preventDefault();
              addPreset(first);
            }
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
  // A zero total is not worth breaking the button into two lines.
  const showToggleTotal = !subtotal.isZero();
  // The purchase screen has no settle strip, so its total always has a row of
  // its own; on a sale the strip already shows it unless rounding moved it.
  const showTotal = mode === "purchase" || rounding !== 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-label="Biaya tambahan"
      aria-activedescendant={activeId}
      onKeyDown={handleKeyDown}
      onClickCapture={onActivate}
      onFocusCapture={onActivate}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <div role="row" className="grid shrink-0 grid-cols-12 border-b">
        <div
          id="cell-header-search"
          role="gridcell"
          aria-selected={focused && isSearch}
          onClick={() => {
            setSelection({ row: HEADER, col: NAME_COLUMN });
            setEditing(false);
          }}
          className={cn(
            "flex items-center gap-2 p-1",
            layout.stageToggle ? "col-span-8" : "col-span-10",
            focused && isSearch && SELECTED_RING,
          )}
        >
          <Kbd>{mode === "sale" ? "F1" : "F2"}</Kbd>
          <Input
            ref={searchRef}
            type="search"
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none placeholder:italic focus-visible:ring-0"
            placeholder="Cari biaya tambahan..."
            aria-autocomplete="list"
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
          />
        </div>
        <div
          id="cell-header-manual"
          role="gridcell"
          aria-selected={focused && manualSelected}
          onClick={() => {
            setSelection({ row: HEADER, col: layout.stageToggle ? 8 : 10 });
            setEditing(false);
          }}
          className={cn(
            "col-span-2 flex items-center border-l p-1",
            focused && manualSelected && SELECTED_RING,
          )}
        >
          <Button
            variant="ghost"
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              insert();
            }}
          >
            <Plus className="size-5" />
            Manual
          </Button>
        </div>
        {layout.stageToggle ? (
          <div
            id="cell-header-toggle"
            role="gridcell"
            aria-selected={focused && toggleSelected}
            onClick={() => {
              setSelection({ row: HEADER, col: 10 });
              setEditing(false);
            }}
            className={cn("col-span-2 border-l p-1", focused && toggleSelected && SELECTED_RING)}
          >
            {showToggleTotal ? (
              <Button
                variant="ghost"
                className="h-auto w-full flex-col items-start gap-0.5 px-2 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle?.();
                }}
              >
                <span className="flex items-center gap-1 text-sm leading-none text-muted-foreground select-none">
                  <ArrowLeft className="size-5" />
                  Produk
                </span>
                <span className="w-full truncate text-base font-bold tabular-nums">
                  {rupiah(subtotal)}
                </span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-full"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle?.();
                }}
              >
                <ArrowLeft />
                Produk
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {shown ? (
        <ExtraSearch
          presets={results}
          containerRef={resultsRef}
          onPick={addPreset}
          onExit={() => searchRef.current?.focus()}
        />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
            {loading ? (
              // Held back for the anti-flash window, but keeping its places —
              // see the same block in `z-Listing.tsx`.
              <ReservedSkeleton className="divide-y divide-border space-y-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-[88px] rounded-none w-full" />
                ))}
              </ReservedSkeleton>
            ) : null}
            {layout.subtotalRow ? (
              <div role="row" className="grid grid-cols-12 border-b">
                <div
                  id="cell-subtotal-subtotal"
                  role="gridcell"
                  aria-selected={selection.row.kind === "subtotal"}
                  onClick={() => {
                    setSelection({ row: SUBTOTAL_ROW, col: 0 });
                    setEditing(false);
                  }}
                  className={cn(
                    "col-span-12 flex items-center justify-between gap-2 bg-card px-3 py-2 text-card-foreground",
                    selection.row.kind === "subtotal" && SELECTED_RING,
                  )}
                >
                  <span className="text-base text-muted-foreground select-none">
                    Subtotal Barang
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{rupiah(subtotal)}</span>
                </div>
              </div>
            ) : null}

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
                            showDual={layout.dual}
                            onChange={(patch) => patchExtra(extra.id, patch)}
                            onRemove={() => removeExtra(extra.id)}
                            onSelect={(field) => selectExtra(extra.id, field)}
                            onStartEdit={(field) => startEditExtra(extra.id, field)}
                            onEditingDone={() => {
                              setSeed(null);
                              setEditing(false);
                            }}
                            seed={seed}
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

          {showTotal ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-card px-3 py-2 text-card-foreground">
              <span className="text-base text-muted-foreground select-none">Total</span>
              <span className="text-2xl font-bold tabular-nums">{rupiah(total)}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
