import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { useDebouncedCallback } from "use-debounce";
import type Decimal from "decimal.js";
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
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kdb";
import { Skeleton } from "~/components/ui/skeleton";
import { ReservedSkeleton } from "~/components/page-data";
import { Input } from "~/components/ui/input";
import { useQuery } from "~/components/Loader";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { SEARCH_DELAY } from "~/lib/constants";
import * as clipboard from "~/lib/clipboard";
import { generateId } from "~/lib/random";
import { service } from "~/services";
import type { DiscountLine, Line } from "~/components/cart/types";
import { withDerivedDiscounts } from "~/lib/purchase";
import { rupiah } from "~/components/cart/util-rupiah";
import type { Listing } from "~/services/listing";
import { ListingCard } from "~/components/cart/z-ListingCard";
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
  PURCHASE_LISTING_LAYOUT,
  SALE_LISTING_LAYOUT,
  type ListingLayout,
} from "~/components/cart/listing-grid";
import { typedDigit } from "~/components/cart/z-Cell";

const HEADER: RowRef = { kind: "header" };

/** The callbacks one cart card needs; stable, so `memo` can skip the card. */
export type CardHandlers = Pick<
  ComponentProps<typeof ListingCard>,
  "onChange" | "onRemove" | "onDiscount" | "onSelect" | "onStartEdit" | "onEditingDone"
>;
const SELECTED_RING = "z-10 ring-1 ring-primary ring-inset";

/** The column a fresh selection remembers when the search bar is the start. */
const NAME_COLUMN = 1;
/** `+manual` is the header's second (sale) or last (purchase) cell. */
const manualColumn = (layout: ListingLayout): number => (layout.stageToggle ? 8 : 10);
const TOGGLE_COLUMN = 10;

/**
 * One edit to one line, with its discount stack brought back in step.
 *
 * A line stores each discount's derived `eff`, so an edit that moves the money
 * (a corrected price, a new quantity) has to re-derive it. Every patch from the
 * card goes through here, so a future field cannot forget: `Persen 10` on
 * Rp10.000 is Rp1.000, and after the price is corrected to Rp20.000 it is
 * Rp2.000 — not the old rupiah under a label that still says `10%`.
 */
function patchLine(line: Line, patch: Partial<Line>): Line {
  const next = { ...line, ...patch };
  if (next.price === line.price && next.qty === line.qty) return next;
  return withDerivedDiscounts(next);
}

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

/** A key pressed inside a field with its own caret: leave its clipboard alone. */
function fromTextField(event: { target: EventTarget | null }): boolean {
  const target = event.target;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/** A clipboard value short enough to read in a toast. */
function brief(text: string, max = 32): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function caretAtEnd(input: HTMLInputElement | null): boolean {
  return input !== null && input.selectionStart === input.value.length;
}

/**
 * Stage one of both carts: choosing the goods. The search bar and `+manual` stay
 * pinned to the top; the lines below scroll, newest on top and numbered from
 * the bottom. One component for both screens: `mode` picks `Harga Jual`/`Harga
 * Beli` and whether the header ends in a `Tambahan` stage toggle.
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
  mode,
  lines,
  extraTotal = null,
  issues,
  onChange,
  onToggle,
  focusSearch,
  focusLast,
  onExitDown,
  focused = true,
  onActivate,
  loading = false,
}: {
  /** A sale reads `Harga Jual` and has a stage toggle; a purchase reads `Harga Beli`. */
  mode: "sale" | "purchase";
  lines: Line[];
  /** The draft is still being read: hold three row places under the header. */
  loading?: boolean;
  /** The inline problems, keyed by line id. */
  issues: Map<string, LineIssue>;
  /** The rupiah all extras come to, or null when there are none. */
  extraTotal?: Decimal | null;
  onChange: (lines: Line[]) => void;
  /** The stage toggle in the header; present on a sale, absent on a purchase. */
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
  const layout = mode === "sale" ? SALE_LISTING_LAYOUT : PURCHASE_LISTING_LAYOUT;
  // What the field shows, and the debounced value the service searches on.
  // One `listing.get.search` per pause, not per keystroke: the product,
  // extra and record searches all debounce, and this one rebuilt a
  // catalogue-sized map plus a rescore and sort for every character typed.
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const pushQuery = useDebouncedCallback(setQuery, SEARCH_DELAY);
  // An Enter that arrives before the search settled — which is every scan, the
  // barcode gun types the code and its Enter in one burst — arms the pick
  // instead of doing it: the listing is added the moment the results for the
  // text on screen land. See `pickFirst` and the effect below.
  const [armed, setArmed] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ row: HEADER, col: NAME_COLUMN });
  const [editing, setEditing] = useState(false);
  // The digit that opened the editor, if a keystroke did (see `typedDigit`).
  const [seed, setSeed] = useState<string | null>(null);
  const [discountFor, setDiscountFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hadDiscount = useRef(false);
  // The page-level F1 token; remembers the value seen at mount so switching
  // stages does not steal focus into the new search bar.
  const seenFocusSearch = useRef(focusSearch);
  // The settle strip's hand-off upward; skip the value at mount so a stage
  // switch does not jump the selection.
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

  const active = cellAt(selection.row, selection.col, layout);
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
  // cell of the last row — the code column.
  useEffect(() => {
    if (focusLast === undefined || focusLast === seenFocusLast.current) return;
    seenFocusLast.current = focusLast;
    const lastRow = rows[rows.length - 1];
    if (lastRow === undefined) return;
    const cells = selectableCells(lastRow, layout);
    const cell = cells[0];
    if (cell === undefined) return;
    setSelection({ row: lastRow, col: cell.start });
    setEditing(false);
    containerRef.current?.focus();
  }, [focusLast, rows, layout]);

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
          update(current.map((row) => (row.id === id ? patchLine(row, patch) : row)));
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
          setSeed(null);
          setEditing(true);
        },
        onEditingDone: () => {
          setSeed(null);
          setEditing(false);
        },
      };
      cache.set(id, handlers);
      return handlers;
    };
  }, []);

  function moveVertical(delta: number): boolean {
    const index = rows.findIndex((row) => sameRow(row, selection.row));
    if (index === -1) return false;
    const next = rows[index + delta];
    if (next === undefined) return false;
    const col = next.kind === "card" && selection.col === 0 ? NAME_COLUMN : selection.col;
    const cell = cellAt(next, col, layout);
    setSelection({
      row: next,
      col: columnIn(cell, col),
      qtySub: cell.field === "qty" ? "value" : undefined,
    });
    setEditing(false);
    return true;
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
    const flat = rows.flatMap((row) => selectableCells(row, layout).map((cell) => ({ row, cell })));
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

  // The line that was just taken again from the search. It jumps to the top of
  // the list, which is easy to miss among the others, so the card nods into
  // place — and the flag clears itself so the cue is not replayed later.
  const [bumped, setBumped] = useState<string | null>(null);
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (bumpTimer.current !== null) clearTimeout(bumpTimer.current);
    },
    [],
  );
  function flash(lineId: string) {
    setBumped(lineId);
    if (bumpTimer.current !== null) clearTimeout(bumpTimer.current);
    bumpTimer.current = setTimeout(() => setBumped(null), 600);
  }

  /** Add a listing to the draft, or bump the line that already holds it. */
  function addListing(listing: Listing) {
    const existing = lines.find((line) => line.listingId === listing.id);
    if (existing !== undefined) {
      // The same goods, taken again: qty +1 *and* the line comes to the top,
      // where a new line would land. Leaving it buried is how the operator talks
      // themselves into scanning a third time because they cannot see the bump.
      onChange([
        patchLine(existing, { qty: existing.qty + 1 }),
        ...lines.filter((line) => line.id !== existing.id),
      ]);
      flash(existing.id);
    } else {
      const blank: DiscountLine = { id: generateId(), value: 0, kind: "percent", eff: 0, total: 0 };
      const line: Line = withDerivedDiscounts({
        id: generateId(),
        listingId: listing.id,
        name: listing.name,
        code: listing.code ?? "",
        kind: listing.kind,
        unit: listing.unit,
        price: listing.price,
        qty: 1,
        discounts: [blank],
        base: {
          name: listing.name,
          code: listing.code ?? "",
          unit: listing.unit,
          price: listing.price,
        },
      });
      onChange([line, ...lines]);
    }
    pushQuery.cancel();
    setInput("");
    setQuery("");
    searchRef.current?.focus();
  }

  /**
   * The text a cell hands to the clipboard, and the patch a pasted string means
   * for it. The two live next to each other on purpose: a copy that a paste
   * cannot read back into the same cell would be a trap.
   *
   * Numbers travel as bare digits — a price copies as `10000`, not `Rp10.000` —
   * so a value copied here can be pasted into a spreadsheet, and a display string
   * pasted back in still lands correctly because `patchFor` keeps only what the
   * cell's own editor would accept.
   */
  function cellText(line: Line, field: Field): string | null {
    switch (field) {
      case "name":
        return line.name;
      case "code":
        return line.code;
      case "qty":
        return String(line.qty);
      case "unit":
        return String(line.unit);
      case "price":
        return String(line.price);
      default:
        return null; // totals, the remove cell, the discount: nothing to carry
    }
  }

  function patchFor(field: Field, text: string): Partial<Line> | null {
    // One line of text, whatever the clipboard held.
    const flat = text.replace(/\s+/g, " ").trim();
    const digits = text.replace(/\D/g, "");
    switch (field) {
      case "name":
        return flat === "" ? null : { name: flat };
      case "code":
        return { code: flat };
      case "qty":
        return digits === "" ? null : { qty: Math.max(0, Number(digits)) };
      case "unit":
        return digits === "" ? null : { unit: Math.max(0, Number(digits)) };
      case "price":
        return digits === "" ? null : { price: Number(digits) };
      default:
        return null;
    }
  }

  /** The line and field under the cursor, when that cell can hold a value. */
  function clipboardCell(): { line: Line; field: Field } | null {
    const row = selection.row;
    if (row.kind !== "card" || !active.editable) return null;
    const line = lines.find((candidate) => candidate.id === row.cardId);
    if (line === undefined) return null;
    const field = active.field;
    if (cellText(line, field as Field) === null) return null;
    return { line, field: field as Field };
  }

  async function copyCell() {
    const cell = clipboardCell();
    if (cell === null) return;
    const text = cellText(cell.line, cell.field);
    if (text === null) return;
    const copied = await clipboard.writeText(text);
    if (!copied) {
      toast.error("Tidak bisa menyalin ke papan klip");
      return;
    }
    toast.success(text === "" ? "Sel kosong disalin" : `Disalin: ${brief(text)}`);
  }

  /**
   * Write the clipboard's text into the selected cell and stay in select mode:
   * the grid is for filling a column quickly, and flipping into an editor would
   * end the run after one paste.
   */
  function pasteCell(text: string) {
    const cell = clipboardCell();
    if (cell === null) return;
    const patch = patchFor(cell.field, text);
    if (patch === null) return;
    onChange(lines.map((line) => (line.id === cell.line.id ? patchLine(line, patch) : line)));
  }

  /** What Enter takes from a result set: the exact code match, else the first. */
  function bestResult(listings: Listing[], query: string): Listing | undefined {
    const code = query.trim().toLowerCase();
    return listings.find((listing) => listing.code?.toLowerCase() === code) ?? listings[0];
  }

  /**
   * Enter in the search field takes the exact code match, else the first result.
   *
   * Picking happens on the next render, not here: the results on screen belong to
   * the previous query until the search for this text lands, and picking from the
   * stale list adds the wrong goods. Making the operator press Enter a second
   * time instead (what this used to do) meant a scanned code added nothing at
   * all — the gun's Enter always arrives before the debounce.
   */
  function pickFirst() {
    if (input !== query) {
      pushQuery.cancel();
      setQuery(input);
    }
    setArmed(input);
  }

  // The armed pick: the results for the text are in, so take the best one.
  //
  // "Are in" cannot be read off `refetching`: a kept value from the previous
  // query is on screen for one render before `useQuery` gets to mark it stale,
  // which is exactly the render Enter lands on. The rows are therefore tracked
  // by identity — every emission is a fresh array — and the text they answer for
  // is recorded with them.
  const answeredData = useRef<unknown>(null);
  const answeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (results.type !== "success") return;
    if (answeredData.current !== results.data) {
      answeredData.current = results.data;
      answeredFor.current = query;
    }
    if (armed === null || answeredFor.current !== armed) return;
    setArmed(null);
    const pick = bestResult(results.data, armed);
    if (pick !== undefined) addListing(pick);
    // `addListing` and `bestResult` are re-created each render and read the fresh
    // `lines`/`input` from this render, which is what the pick wants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, query, results]);

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
        candidate.id === line.id ? patchLine(candidate, { qty }) : candidate,
      ),
    );
  }

  function activate() {
    // Enter or a click opens the editor on the value, not on a key typed earlier.
    setSeed(null);
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
      case "toggle":
        onToggle?.();
        return;
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
    // Copy and paste on the selected cell. A field that has a caret of its own —
    // the search bar, an open editor — keeps the browser's own copy and paste.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !fromTextField(event)) {
      const key = event.key.toLowerCase();
      if (key === "c") {
        // Nothing of ours on this cell: leave the browser's own copy alone.
        if (clipboardCell() === null) return;
        event.preventDefault();
        void copyCell();
        return;
      }
      if (key === "v") {
        // Same for a cell that cannot take a value, and for a webview without a
        // readable clipboard — its own `paste` event still delivers the text
        // (`onPaste` below).
        if (clipboardCell() === null || !clipboard.canRead()) return;
        event.preventDefault();
        void clipboard.readText().then((text) => {
          if (text !== null) pasteCell(text);
        });
        return;
      }
    }
    // A digit on a selected number cell opens its editor with that digit, so the
    // value is replaced rather than appended to — no Enter, no Backspace first.
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
        if (isSearch && hidden) {
          resultsRef.current?.focus();
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
  const toggleSelected = selection.row.kind === "header" && active.field === "toggle";
  // A zero extra total is not worth breaking the button into two lines.
  const showExtraTotal = extraTotal !== null && !extraTotal.isZero();
  const discountLine = lines.find((line) => line.id === discountFor) ?? null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-label={mode === "sale" ? "Barang yang dijual" : "Barang yang dibeli"}
      aria-activedescendant={activeId}
      onKeyDown={handleKeyDown}
      // The fallback path for a webview where `navigator.clipboard.readText` is
      // missing: the browser still hands the text to a `paste` event.
      onPaste={(event) => {
        if (editing || fromTextField(event)) return;
        const text = event.clipboardData?.getData("text") ?? "";
        if (text === "") return;
        event.preventDefault();
        pasteCell(text);
      }}
      onClickCapture={onActivate}
      onFocusCapture={onActivate}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <div role="row" className="grid shrink-0 grid-cols-12 border-b">
        <div
          id="cell-header-search"
          onClick={() => {
            setSelection({ row: HEADER, col: NAME_COLUMN });
            setEditing(false);
          }}
          role="gridcell"
          aria-selected={focused && isSearch}
          className={cn(
            "flex items-center gap-2 p-1",
            layout.stageToggle ? "col-span-8" : "col-span-10",
            focused && isSearch && SELECTED_RING,
          )}
        >
          <Kbd className="py-5 small:py-4">F1</Kbd>
          <Input
            ref={searchRef}
            type="search"
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none placeholder:italic focus-visible:ring-0"
            placeholder={
              mode === "sale" ? "Cari barang untuk dijual..." : "Cari barang untuk dibeli..."
            }
            aria-autocomplete="list"
            value={input}
            onChange={(event) => {
              const next = event.currentTarget.value;
              // Typing again retires a pick that was armed but never fired.
              setArmed(null);
              setInput(next);
              pushQuery(next);
            }}
          />
        </div>
        <div
          id="cell-header-manual"
          role="gridcell"
          aria-selected={focused && manualSelected}
          onClick={() => {
            setSelection({ row: HEADER, col: manualColumn(layout) });
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
            <Plus className="icon" />
            Manual
          </Button>
        </div>
        {layout.stageToggle ? (
          <div
            id="cell-header-toggle"
            role="gridcell"
            aria-selected={focused && toggleSelected}
            onClick={() => {
              setSelection({ row: HEADER, col: TOGGLE_COLUMN });
              setEditing(false);
            }}
            className={cn("col-span-2 border-l p-1", focused && toggleSelected && SELECTED_RING)}
          >
            {!showExtraTotal ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle?.();
                }}
              >
                Tambahan
                <ArrowRight />
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="h-auto w-full flex-col items-start gap-0.5 px-2 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle?.();
                }}
              >
                <span className="flex items-center gap-1 text-small leading-none text-muted-foreground select-none">
                  Tambahan
                  <ArrowRight className="icon" />
                </span>
                <span className="w-full truncate text-normal font-bold tabular-nums">
                  {rupiah(extraTotal)}
                </span>
              </Button>
            )}
          </div>
        ) : null}
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
          {loading ? (
            // Held back for the anti-flash window, but keeping its places: the
            // rows are the body of a `flex-1` panel, so the frame does not move
            // either way, and the three rows are already the height of the lines
            // that replace them.
            <ReservedSkeleton className="divide-y space-y-1 divide-border">
              {Array.from({ length: 3 }).map((_, index) => (
                // A real cart line is two cell rows: 141 tall big, 113 small.
                <Skeleton key={index} className="h-[141px] rounded-none w-full small:h-[113px]" />
              ))}
            </ReservedSkeleton>
          ) : null}
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
                        bumped={bumped === line.id}
                        seed={seed}
                        priceLabel={mode === "sale" ? "Harga Masuk" : "Harga Keluar"}
                        number={lines.length - index}
                        issue={issues.get(line.id)}
                        selected={cardSelected && focused ? (active.field as Field) : null}
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
