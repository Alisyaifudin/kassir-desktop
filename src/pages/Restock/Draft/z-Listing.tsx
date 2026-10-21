import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import { Stream } from "effect";
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
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kdb";
import { Input } from "~/components/ui/input";
import { useQuery } from "~/components/Loader";
import { cn } from "~/lib/utils";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { generateId } from "~/lib/random";
import { service } from "~/services";
import type { DiscountLine, Line } from "~/components/cart/types";
import { recalcDiscounts } from "~/lib/purchase";
import type { Listing } from "~/services/listing";
import { ListingCard } from "./z-ListingCard";
import type { LineIssue } from "~/components/cart/code-issues";
import { DiscountDialog } from "~/components/cart/z-Discount";
import { SearchResults } from "~/components/cart/z-SearchResults";
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

/** The callbacks one cart card needs; stable, so `memo` can skip the card. */
export type CardHandlers = Pick<
  ComponentProps<typeof ListingCard>,
  "onChange" | "onRemove" | "onDiscount" | "onSelect" | "onStartEdit" | "onEditingDone"
>;
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
    unit: 1,
    price: 0,
    qty: 1,
    discounts: [{ id: generateId(), value: 0, kind: "percent", eff: 0, total: 0 }],
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
 * The lines are the draft's `tx_listings` rows; the parent writes each edit
 * back through the transaction service.
 */
export function Listing({
  lines,
  issues,
  onChange,
  focusSearch,
  focusLast,
}: {
  lines: Line[];
  /** The inline problems, keyed by line id. */
  issues: Map<string, LineIssue>;
  onChange: (lines: Line[]) => void;
  focusSearch: number;
  focusLast: number;
}) {
  // What the field shows, and the debounced value the service searches on.
  // One `listing.get.search` per pause, not per keystroke: the product,
  // extra and record searches all debounce, and this one rebuilt a
  // catalogue-sized map plus a rescore and sort for every character typed.
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const pushQuery = useDebouncedCallback(setQuery, DEBOUNCE_DELAY);
  const [selection, setSelection] = useState<Selection>({ row: HEADER, col: NAME_COLUMN });
  const [editing, setEditing] = useState(false);
  const [discountFor, setDiscountFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hadDiscount = useRef(false);
  // The page-level F1 token; remembers the value seen at mount so switching
  // stages does not steal focus into the new search bar.
  const seenFocusSearch = useRef(focusSearch);
  // Bayar / the payment grid's Up hand-off; skip the value at mount.
  const seenFocusLast = useRef(focusLast);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // While the search bar has text the cards make way for the future results.
  // The results pane appears as soon as a character is typed; only the query
  // itself waits for the pause.
  const hidden = input.trim() !== "";
  const ids = useMemo(() => lines.map((line) => line.id), [lines]);
  const rows = useMemo(() => rowsFor(hidden ? [] : ids), [hidden, ids]);
  const results = useQuery(() => Stream.fromEffect(service.listing.get.search(query)), [query], {
    keepPrevious: true,
  });

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

  // When the settle strip hands off upward, land on the first cell of the last
  // row — the code column.
  useEffect(() => {
    if (focusLast === seenFocusLast.current) return;
    seenFocusLast.current = focusLast;
    const lastRow = rows[rows.length - 1];
    if (lastRow === undefined) return;
    const cells = selectableCells(lastRow);
    const cell = cells[0];
    if (cell === undefined) return;
    setSelection({ row: lastRow, col: cell.start });
    setEditing(false);
    containerRef.current?.focus();
  }, [focusLast, rows]);

  useEffect(() => {
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  // The discount dialog traps focus while it is open; take it back for the grid
  // once it closes, so the arrows keep working. Radix restores focus in a timer
  // of its own, so wait one tick to run after it.
  useEffect(() => {
    if (discountFor !== null) {
      hadDiscount.current = true;
      return;
    }
    if (!hadDiscount.current) return;
    hadDiscount.current = false;
    const timer = setTimeout(() => containerRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [discountFor]);

  // Stable per-line callbacks: the card is memoised, so a keystroke in the search
  // bar or in one cell must not re-render the other `useSortable`/`motion`
  // nodes. They read the current lines and selection through refs, so their
  // identity survives every render.
  const latest = useRef({ lines, onChange, removeCard });
  latest.current = { lines, onChange, removeCard };
  const handlersFor = useMemo(() => {
    const cache = new Map<string, CardHandlers>();
    return (id: string) => {
      const cached = cache.get(id);
      if (cached !== undefined) return cached;
      const handlers: CardHandlers = {
        onChange: (patch) => {
          const { lines: current, onChange: update } = latest.current;
          update(current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
        },
        onRemove: () => latest.current.removeCard(id),
        onDiscount: () => setDiscountFor(id),
        onSelect: (field, sub) => {
          setSelection({
            row: { kind: "card", cardId: id, part: partOf(field) },
            col: startOf(field),
            qtySub: field === "qty" ? (sub ?? "value") : undefined,
          });
          setEditing(false);
        },
        onStartEdit: (field) => {
          setSelection({
            row: { kind: "card", cardId: id, part: partOf(field) },
            col: startOf(field),
          });
          setEditing(true);
        },
        onEditingDone: () => setEditing(false),
      };
      cache.set(id, handlers);
      return handlers;
    };
  }, []);

  function moveVertical(delta: number) {
    const index = rows.findIndex((row) => sameRow(row, selection.row));
    if (index === -1) return;
    const next = rows[index + delta];
    if (next === undefined) return;
    const col = next.kind === "card" && selection.col === 0 ? NAME_COLUMN : selection.col;
    const cell = cellAt(next, col);
    setSelection({
      row: next,
      col: columnIn(cell, col),
      qtySub: cell.field === "qty" ? "value" : undefined,
    });
    setEditing(false);
  }

  function moveHorizontal(delta: number) {
    // Inside Kuantitas the three sub-cells walk before leaving the cell.
    if (active.field === "qty" && selection.row.kind === "card") {
      const sub = selection.qtySub ?? "value";
      if (delta < 0) {
        if (sub === "right") {
          setSelection({ ...selection, qtySub: "value" });
          setEditing(false);
          return;
        }
        if (sub === "value") {
          setSelection({ ...selection, qtySub: "left" });
          setEditing(false);
          return;
        }
      } else {
        if (sub === "left") {
          setSelection({ ...selection, qtySub: "value" });
          setEditing(false);
          return;
        }
        if (sub === "value") {
          setSelection({ ...selection, qtySub: "right" });
          setEditing(false);
          return;
        }
      }
    }
    const flat = rows.flatMap((row) => selectableCells(row).map((cell) => ({ row, cell })));
    const index = flat.findIndex(
      (entry) => sameRow(entry.row, selection.row) && entry.cell.field === active.field,
    );
    const next = flat[index + delta];
    if (next === undefined) return;
    setSelection({
      row: next.row,
      col: next.cell.start,
      qtySub: next.cell.field === "qty" ? (delta > 0 ? "left" : "right") : undefined,
    });
    setEditing(false);
  }

  function insert() {
    const line = blankLine();
    onChange([line, ...lines]);
    setSelection({ row: { kind: "card", cardId: line.id, part: "top" }, col: NAME_COLUMN });
    setEditing(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const from = lines.findIndex((line) => line.id === active.id);
    const to = lines.findIndex((line) => line.id === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(lines, from, to));
  }

  /** Add a listing to the draft, or bump the line that already holds it. */
  function addListing(listing: Listing) {
    const existing = lines.find((line) => line.listingId === listing.id);
    if (existing !== undefined) {
      const qty = existing.qty + 1;
      onChange(
        lines.map((line) =>
          line.id === existing.id
            ? { ...line, qty, discounts: recalcDiscounts(line.price, qty, line.discounts) }
            : line,
        ),
      );
    } else {
      const blank: DiscountLine = { id: generateId(), value: 0, kind: "percent", eff: 0, total: 0 };
      const line: Line = {
        id: generateId(),
        listingId: listing.id,
        name: listing.name,
        code: listing.code ?? "",
        unit: listing.unit,
        price: listing.price,
        qty: 1,
        discounts: recalcDiscounts(listing.price, 1, [blank]),
        base: {
          name: listing.name,
          code: listing.code ?? "",
          unit: listing.unit,
          price: listing.price,
        },
      };
      onChange([line, ...lines]);
    }
    pushQuery.cancel();
    setInput("");
    setQuery("");
    searchRef.current?.focus();
  }

  /** Enter in the search field takes the exact code match, else the first result. */
  function pickFirst() {
    // Enter before the debounce fired: the list on screen still belongs to the
    // previous query, and picking from it would add the wrong goods. Bring the
    // query up to date first; the results land in a few milliseconds.
    if (input !== query) {
      pushQuery.cancel();
      setQuery(input);
      return;
    }
    if (results.type !== "success" || results.data.length === 0) return;
    const code = query.trim().toLowerCase();
    const exact = results.data.find((listing) => listing.code?.toLowerCase() === code);
    addListing(exact ?? results.data[0]);
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

  function bumpQty(delta: number) {
    const row = selection.row;
    if (row.kind !== "card") return;
    const line = lines.find((candidate) => candidate.id === row.cardId);
    if (line === undefined) return;
    const qty = Math.max(0, line.qty + delta);
    onChange(
      lines.map((candidate) =>
        candidate.id === line.id
          ? {
              ...candidate,
              qty,
              discounts: recalcDiscounts(candidate.price, qty, candidate.discounts),
            }
          : candidate,
      ),
    );
  }

  function activate() {
    if (active.field === "qty") {
      const sub = selection.qtySub ?? "value";
      if (sub === "left") {
        bumpQty(-1);
        return;
      }
      if (sub === "right") {
        bumpQty(1);
        return;
      }
    }
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
        return; // the listing's grandTotal is selectable but does nothing
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The discount dialog and its select portal to the body; their keys still
    // bubble here through the React tree. Ignore anything not inside this grid.
    if (!event.currentTarget.contains(event.target as Node)) return;
    // The search-results grid lives inside this container; do not also move the
    // listing selection for keys it already handled.
    if (event.defaultPrevented) return;
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
        if (isSearch) {
          if (hidden) {
            event.preventDefault();
            pickFirst();
          }
          return;
        }
        event.preventDefault();
        activate();
        return;
    }
  }

  const manualSelected = selection.row.kind === "header" && active.field === "manual";
  const discountLine = lines.find((line) => line.id === discountFor) ?? null;

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
          className={cn("col-span-10 flex items-center gap-2 p-1", isSearch && SELECTED_RING)}
        >
          <Kbd className="py-5 small:py-4">F1</Kbd>
          <Input
            ref={searchRef}
            type="search"
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none placeholder:italic focus-visible:ring-0"
            placeholder="Cari barang untuk dibeli..."
            aria-autocomplete="list"
            value={input}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setInput(next);
              pushQuery(next);
            }}
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

      {hidden ? (
        <SearchResults
          res={results}
          containerRef={resultsRef}
          onPick={addListing}
          onExit={() => searchRef.current?.focus()}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {lines.map((line, index) => {
                    const cardSelected =
                      selection.row.kind === "card" && selection.row.cardId === line.id;
                    return (
                      <ListingCard
                        key={line.id}
                        {...handlersFor(line.id)}
                        line={line}
                        number={lines.length - index}
                        issue={issues.get(line.id)}
                        selected={cardSelected ? (active.field as Field) : null}
                        selectedSub={
                          cardSelected && active.field === "qty"
                            ? (selection.qtySub ?? "value")
                            : undefined
                        }
                        editing={cardSelected && editing}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <DiscountDialog
        open={discountFor !== null}
        onOpenChange={(open) => {
          if (!open) setDiscountFor(null);
        }}
        line={discountLine}
        onChange={(discounts) =>
          onChange(lines.map((line) => (line.id === discountFor ? { ...line, discounts } : line)))
        }
      />
    </div>
  );
}
