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
import { Effect, Either, Stream } from "effect";
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
import { recalcDiscounts, withDerivedDiscounts } from "~/lib/purchase";
import { parseClipboardNumber } from "~/components/cart/clipboard-number";
import {
  parseDiscounts,
  serializeDiscounts,
  type CopiedDiscount,
} from "~/components/cart/discount-clipboard";
import { rupiah } from "~/components/cart/util-rupiah";
import type { Combo } from "~/services/combo";
import type { Listing } from "~/services/listing";
import { getComboIndex, searchCombos } from "~/lib/search/combos";
import { getListingIndex, searchListings } from "~/lib/search/listings";
import { norm } from "~/lib/search/normalize";
import { ListingCard } from "~/components/cart/z-ListingCard";
import type { LineIssue } from "~/components/cart/code-issues";
import { DiscountDialog } from "~/components/cart/z-Discount";
import { ProductDetailDialog } from "~/components/cart/z-ProductDetail";
import { ProductImagesDialog } from "~/components/cart/z-ProductImages";
import { SearchResults, type SearchHit } from "~/components/cart/z-SearchResults";
import {
  cellAt,
  columnIn,
  horizontalNeighbour,
  partOf,
  rowsFor,
  sameRow,
  startOf,
  type Field,
  type ImageSide,
  type RowRef,
  type Selection,
  PURCHASE_LISTING_LAYOUT,
  SALE_LISTING_LAYOUT,
  type ListingLayout,
} from "~/components/cart/listing-grid";
import {
  SELECTED_RING,
  caretAtValueEnd,
  caretAtValueStart,
  typedCharacter,
  typedDigit,
} from "~/components/cart/z-Cell";
import { Show } from "../Show";

const HEADER: RowRef = { kind: "header" };

/** The callbacks one cart card needs; stable, so `memo` can skip the card. */
type CardHandlers = Pick<
  ComponentProps<typeof ListingCard>,
  | "onChange"
  | "onRemove"
  | "onDiscount"
  | "onSelect"
  | "onStartEdit"
  | "onEditingDone"
  | "onDetail"
  | "onViewImages"
  | "onLock"
>;

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
 * and enters edit mode on Enter, a double-click, or — as a spreadsheet does — the
 * first printable character typed over a text or numeric cell. An arrow that has
 * run to the edge of an open editor commits it and moves on. See `listing-grid.ts`
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
  onPickCombo,
  onToggle,
  focusSearch,
  focusLast,
  onExitDown,
  focused = true,
  onActivate,
  loading = false,
  fix = 0,
}: {
  /** A sale reads `Harga Jual` and has a stage toggle; a purchase reads `Harga Beli`. */
  mode: "sale" | "purchase";
  lines: Line[];
  /** The record's decimal places, so a decimal price is drawn as it was typed. */
  fix?: number;
  /** The draft is still being read: hold three row places under the header. */
  loading?: boolean;
  /** The inline problems, keyed by line id. */
  issues: Map<string, LineIssue>;
  /** The rupiah all extras come to, or null when there are none. */
  extraTotal?: Decimal | null;
  onChange: (lines: Line[]) => void;
  /** Adds a combo template to the active sale; absent from purchase carts. */
  onPickCombo?: (combo: Combo) => void;
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
  // The product whose detail sheet is up, with the listing the card holds: the
  // sheet marks that one in the list. Captured on open so deleting the line
  // underneath does not empty a sheet the operator is still reading. Either id
  // can be missing — a copied cart names only its listing — and the sheet reads
  // whichever one it got.
  const [detailFor, setDetailFor] = useState<{
    productId: string | null;
    listingId: string | null;
  } | null>(null);
  // The photos of the product behind a card, opened from the card's photo with
  // the cover already in hand: the gallery itself is read by the dialog, since a
  // cart line only ever carries that one cover.
  const [imagesFor, setImagesFor] = useState<{
    productId: string | null;
    cover: Line["cover"];
  } | null>(null);
  // The card locked for reordering (see the grip cell): while it is set, the up
  // and down arrows move that card in the list instead of moving the cursor.
  const [locked, setLocked] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hadDialog = useRef(false);
  // The page-level F1 token; remembers the value seen at mount so switching
  // stages does not steal focus into the new search bar.
  // `0`, not the value this grid mounts with: a focus request can arrive in the
  // same commit as the mount — a stage change and its bump from one handler, a
  // commit that closes its dialog and returns to the goods — and a ref seeded
  // with the current token would swallow exactly that request. The token only
  // counts up, so 0 is "nothing asked yet".
  const seenFocusSearch = useRef(0);
  // The settle strip's hand-off upward; skip the value at mount so a stage
  // switch does not jump the selection.
  const seenFocusLast = useRef(focusLast);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // `typedText`, not `typed`: the key handlers declare their own `typed` for the
  // digit a keystroke stands for, and a shadowed name here would compare that.
  const typedText = input.trim();
  const ids = useMemo(() => lines.map((line) => line.id), [lines]);
  // A combo is a cart shortcut on both screens: Pos sells its bundle, Restock
  // buys the same component listings. A screen without a picker (a read-only
  // cart) simply omits the callback.
  const searchCombosEnabled = onPickCombo !== undefined;
  const results = useQuery(
    () =>
      Stream.fromEffect(
        Effect.gen(function* () {
          if (!searchCombosEnabled || query.trim() === "") {
            const listingMatches = yield* service.listing.get.search(query);
            return listingMatches.map((listing): SearchHit => ({ kind: "listing", listing }));
          }

          // Both units are scored from one catalogue read and one shared ladder,
          // so the answers interleave by relevance instead of being concatenated.
          // The listing index is the same cached one the service searches (keyed
          // by text signature), so this costs no extra pass over the catalogue.
          const [catalog, combos, extras] = yield* Effect.all([
            service.listing.get.all(),
            service.combo.get.all(),
            service.extra.get.all(),
          ]);
          const extraById = new Map(extras.map((extra) => [extra.id, extra]));
          const catalogById = new Map(catalog.map((listing) => [listing.id, listing]));
          const scored: { hit: SearchHit; score: number }[] = [];

          for (const hit of searchListings(getListingIndex(catalog), query)) {
            const listing = catalogById.get(hit.id);
            if (listing === undefined) continue;
            scored.push({ hit: { kind: "listing", listing }, score: hit.score });
          }

          const comboById = new Map(combos.map((combo) => [combo.id, combo]));
          for (const hit of searchCombos(
            getComboIndex(combos, { listings: catalog, extras }),
            query,
          )) {
            const combo = comboById.get(hit.id);
            if (combo === undefined) continue;
            scored.push({
              score: hit.score,
              hit: {
                kind: "combo",
                combo,
                components: combo.components.flatMap((component) => {
                  const listing = catalogById.get(component.listingId);
                  return listing === undefined ? [] : [listing];
                }),
                extraNames: combo.extras.flatMap((extra) => {
                  const preset = extraById.get(extra.extraId);
                  if (preset === undefined) return [];
                  const value =
                    preset.kind === "percent" ? `${preset.value}%` : rupiah(preset.value);
                  return [`${preset.name} ${value}`];
                }),
              },
            });
          }

          // Highest first. Listing answers were pushed first and the sort is
          // stable, so an exact tie leaves the goods ahead of the bundle that
          // expands into them.
          return scored.sort((left, right) => right.score - left.score).map(({ hit }) => hit);
        }),
      ),
    [query, mode, searchCombosEnabled],
    { keepPrevious: true },
  );
  // Which text the answers in `results` belong to. `useQuery` hands back a new
  // array per answer, so one that survived a render still belongs to the query of
  // the render that replaced it — tracked by identity rather than by reading
  // `refetching`, which an effect sets one frame later: that frame is exactly the
  // one a scan's Enter lands on (see `armed`), and a stale answer would count as
  // settled for it.
  const answeredData = useRef<unknown>(null);
  const answeredFor = useRef<string | null>(null);
  // A failure is an answer too: the pane has to open for it, or a broken search
  // would leave the grid untouched and the operator with no sign anything ran.
  const answer: unknown =
    results.type === "success"
      ? results.data
      : results.type === "error"
        ? results.error
        : undefined;
  if (answer !== undefined && answeredData.current !== answer) {
    answeredData.current = answer;
    answeredFor.current = query;
  }
  const settled = typedText !== "" && (answeredFor.current ?? "").trim() === typedText;
  // The pane only takes over once there is something to show in its place: the
  // pause is over and the search for the text on screen has answered. Until then
  // the cards stay — typing must not blank the grid for a list that does not
  // exist yet — and once it is up it stays up while there is text, so narrowing a
  // query does not flash the grid back between keystrokes.
  const [pane, setPane] = useState(false);
  // ArrowDown emptied the bar into the list before the list existed; the focus
  // lands the moment it is painted.
  const wantListFocus = useRef(false);
  useEffect(() => {
    if (typedText === "") {
      setPane(false);
      // A clear bar cancels a pending trip into the list as well.
      wantListFocus.current = false;
    } else if (settled) setPane(true);
  }, [typedText, settled]);
  // An empty bar is never covered — not even for the render before the effect
  // above notices, which is the render a pick returns the bar in.
  const shown = typedText !== "" && pane;
  useEffect(() => {
    if (!shown || !wantListFocus.current) return;
    const list = resultsRef.current;
    if (list === null) return;
    wantListFocus.current = false;
    list.focus();
  }, [shown, results]);
  const rows = useMemo(() => {
    const withCover = new Set(lines.filter((line) => line.cover != null).map((line) => line.id));
    return rowsFor(shown ? [] : ids, (id) => withCover.has(id));
  }, [shown, ids, lines]);

  const active = cellAt(selection.row, selection.col, layout);
  const isSearch = selection.row.kind === "header" && active.field === "search";
  const activeId =
    selection.row.kind === "header"
      ? `cell-header-${active.field}`
      : `cell-${selection.row.cardId}-${active.field}`;

  // A card that was deleted or is covered by the results must not keep the
  // selection — nor the lock, which would then move a card nobody can see.
  useEffect(() => {
    if (shown && selection.row.kind === "card") {
      setSelection({ row: HEADER, col: NAME_COLUMN });
      setEditing(false);
    }
    if (shown) setLocked(null);
  }, [shown, selection.row]);

  // A locked card that was removed (the `x` cell, a delete key, a reload of the
  // draft) leaves nothing to move: let the list go.
  useEffect(() => {
    if (locked !== null && !lines.some((line) => line.id === locked)) setLocked(null);
  }, [lines, locked]);

  // Only the panel that owns the keyboard may be moving a card: losing the
  // selection to the settle strip or the stage toggle ends the move, or the
  // arrows would come back to a lock nobody can see the key for.
  useEffect(() => {
    if (!focused) setLocked(null);
  }, [focused]);

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

  // Unified grid: when the settle strip hands off upward, land on the code cell
  // of the last row. Named rather than "the first selectable cell": column 0 is
  // the drag handle, which is selectable but is not where a return lands.
  useEffect(() => {
    if (focusLast === undefined || focusLast === seenFocusLast.current) return;
    seenFocusLast.current = focusLast;
    const lastRow = rows[rows.length - 1];
    if (lastRow === undefined) return;
    const cell = cellAt(lastRow, 1, layout);
    setSelection({ row: lastRow, col: cell.start });
    setEditing(false);
    containerRef.current?.focus();
  }, [focusLast, rows, layout]);

  useEffect(() => {
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  // Which half of the card the cursor came from when it stepped onto the photo.
  //
  // The photo is one box standing beside both rows, so the way back out of it to
  // the right is the row the operator was in: left out of the handle must return
  // to the handle, not climb to the number above it. Tracked here, off the
  // selection, rather than in each mover — the photo is reached from the number
  // and the handle (and, in principle, from a row above or below), and a mover
  // that forgot to record the side would send the cursor to the wrong half.
  // Anything that is not a card row leaves the default: the top row.
  const imageFrom = useRef<ImageSide>("top");
  const previousRow = useRef<RowRef>(selection.row);
  useEffect(() => {
    if (active.field === "image") {
      const previous = previousRow.current;
      imageFrom.current = previous.kind === "card" ? previous.part : "top";
    }
    previousRow.current = selection.row;
  }, [selection, active.field]);

  const dialogOpen = discountFor !== null || detailFor !== null || imagesFor !== null;

  // A dialog traps focus while it is open; take it back for the grid once they
  // close, so the arrows keep working. Radix restores focus in a timer of its
  // own, so wait one tick to run after it.
  useEffect(() => {
    if (dialogOpen) {
      hadDialog.current = true;
      return;
    }
    if (!hadDialog.current) return;
    hadDialog.current = false;
    const timer = setTimeout(() => containerRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [dialogOpen]);

  // Stable per-line callbacks: the card is memoised, so a keystroke in the search
  // bar or in one cell must not re-render the other `useSortable`/`motion`
  // nodes. They read the current lines and selection through refs, so their
  // identity survives every render.
  const latest = useRef({ lines, onChange, removeCard, openDetail, openImages, lockCard });
  latest.current = { lines, onChange, removeCard, openDetail, openImages, lockCard };
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
        onDetail: () => latest.current.openDetail(id),
        onViewImages: () => latest.current.openImages(id),
        onLock: () => latest.current.lockCard(id),
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
    // Column 0 is a real column now — the number above, the drag handle below —
    // so a move keeps it like any other. A wide neighbour still clamps it.
    const col = selection.col;
    const cell = cellAt(next, col, layout);
    setSelection({
      row: next,
      col: columnIn(cell, col),
      qtySub: cell.field === "qty" ? "value" : undefined,
    });
    setEditing(false);
    return true;
  }

  /**
   * Walk the flat row-major order of cells. `wrap` is for leaving an editor: an
   * arrow that has nowhere to go inside the value wraps around the grid instead
   * of doing nothing, so the key never feels ignored.
   */
  function moveHorizontal(delta: number, wrap = false) {
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
    // The geometry of the walk — the photo's three neighbours included — is
    // `horizontalNeighbour`'s; this only applies the step it chose.
    const next = horizontalNeighbour(rows, selection, layout, delta, {
      wrap,
      imageFrom: imageFrom.current,
    });
    if (next === undefined) return;
    setSelection({
      row: next.row,
      col: next.col,
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
        patchLine(existing, {
          qty: existing.qty + 1,
          cover: listing.cover,
          productId: listing.productId,
        }),
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
        cover: listing.cover,
        productId: listing.productId,
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
   * The values a line was taken from — the catalog's name, code, unit and price —
   * are what its cells undo back to, and its cover is what the card draws.
   * Neither is stored: `DraftListing.base` and `DraftListing.cover` are UI state
   * with no column behind them, so a reload came back with the line intact and
   * every undo button gone, with no way to learn the origin again.
   *
   * So the grid reads them back. One catalog read covers every line that arrived
   * without a base — not one per card — and each listing id is asked for at most
   * once: a line whose listing has since been deleted would otherwise re-read the
   * whole catalog on every keystroke, since every edit re-runs this.
   */
  const askedBase = useRef(new Set<string>());
  // The freshest lines, for the read's callback: it lands a tick later, and an
  // edit in between must not be overwritten by the restore.
  const freshestLines = useRef(lines);
  freshestLines.current = lines;
  useEffect(() => {
    const wanted = lines.filter(
      (line) =>
        line.base === undefined && line.listingId != null && !askedBase.current.has(line.listingId),
    );
    if (wanted.length === 0) return;
    for (const line of wanted) {
      if (line.listingId != null) askedBase.current.add(line.listingId);
    }
    void Effect.runPromise(Effect.either(service.listing.get.all())).then((result) => {
      if (Either.isLeft(result)) return;
      const catalog = new Map(result.right.map((listing) => [listing.id, listing]));
      const current = freshestLines.current;
      const restored = current.map((line) => {
        if (line.base !== undefined || line.listingId == null) return line;
        const listing = catalog.get(line.listingId);
        if (listing === undefined) return line;
        return {
          ...line,
          cover: listing.cover,
          productId: listing.productId,
          base: {
            name: listing.name,
            code: listing.code ?? "",
            unit: listing.unit,
            price: listing.price,
          },
        };
      });
      if (restored.some((line, index) => line !== current[index])) onChange(restored);
    });
  }, [lines, onChange]);

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
      case "diskon":
        // The stack, not one number: see `discount-clipboard.ts`.
        return serializeDiscounts(line.discounts);
      default:
        return null; // totals, the remove cell: nothing to carry
    }
  }

  /**
   * A copied discount stack, re-derived against the line it is pasted onto.
   *
   * The values travel, the money does not: `10%` of the source line is not `10%`
   * of this one, and `number` is clamped to what is left so a stack copied from a
   * bigger line cannot overrun this one. A `pcs` discount cannot exceed the qty.
   * The trailing blank row the dialog always keeps is added back here.
   */
  function discountsFrom(line: Line, copied: readonly CopiedDiscount[]): DiscountLine[] {
    const rows: DiscountLine[] = copied.map((entry) => {
      let value = entry.value;
      if (entry.kind === "percent") value = Math.min(value, 100);
      if (entry.kind === "pcs") value = Math.min(value, Math.max(line.qty, 0));
      return { id: generateId(), value, kind: entry.kind, eff: 0, total: 0 };
    });
    const blank: DiscountLine = { id: generateId(), value: 0, kind: "percent", eff: 0, total: 0 };
    return recalcDiscounts(line.price, line.qty, [...rows, blank]);
  }

  function patchFor(line: Line, field: Field, text: string): Partial<Line> | null {
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
      case "price": {
        // A copy travels in English (`20000.2`); a display string is Indonesian
        // (`Rp20.000,2`). Both have to land on the same number — the old
        // digits-only read turned `20000.2` into `200.002`.
        const price = parseClipboardNumber(text);
        return price === null ? null : { price: Math.max(0, price) };
      }
      case "diskon": {
        const copied = parseDiscounts(text);
        return copied === null ? null : { discounts: discountsFrom(line, copied) };
      }
      default:
        return null;
    }
  }

  /** The line and field under the cursor, when that cell can hold a value. */
  function clipboardCell(): { line: Line; field: Field } | null {
    const row = selection.row;
    if (row.kind !== "card") return null;
    const line = lines.find((candidate) => candidate.id === row.cardId);
    if (line === undefined) return null;
    const field = active.field as Field;
    // Diskon is not typed into, but it is still a value worth carrying.
    if (field !== "diskon" && !active.editable) return null;
    if (cellText(line, field) === null) return null;
    return { line, field };
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
    if (cell.field === "diskon") {
      const count = cell.line.discounts.filter((discount) => discount.value !== 0).length;
      toast.success(count === 0 ? "Diskon kosong disalin" : `Disalin: diskon ${count} baris`);
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
    const patch = patchFor(cell.line, cell.field, text);
    if (patch === null) {
      if (cell.field === "diskon") toast.error("Papan klip tidak berisi diskon");
      return;
    }
    onChange(lines.map((line) => (line.id === cell.line.id ? patchLine(line, patch) : line)));
  }

  /** Exact listing codes win; otherwise an exact combo name beats a fuzzy listing hit. */
  function bestResult(hits: SearchHit[], query: string): SearchHit | undefined {
    const code = query.trim().toLowerCase();
    const exactCode = hits.find(
      (hit) => hit.kind === "listing" && hit.listing.code?.toLowerCase() === code,
    );
    if (exactCode !== undefined) return exactCode;
    const exactCombo = hits.find(
      (hit) => hit.kind === "combo" && norm(hit.combo.name) === norm(query),
    );
    return exactCombo ?? hits[0];
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
  useEffect(() => {
    if (armed === null || answeredFor.current !== armed) return;
    if (results.type !== "success") return;
    setArmed(null);
    const pick = bestResult(results.data, armed);
    if (pick?.kind === "listing") addListing(pick.listing);
    else if (pick?.kind === "combo") pickCombo(pick.combo);
    // `addListing` and `bestResult` are re-created each render and read the fresh
    // `lines`/`input` from this render, which is what the pick wants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, query, results]);

  // Enter is the only way into the cart. Nothing here adds a listing because the
  // text happens to *be* a code: a full code is typed by hand as often as it is
  // scanned — to look the goods up — and taking the search's answer for a
  // submission put them in the cart unasked. Deliberately no "a scan ends on an
  // exact code" shortcut: a scan is unaffected, because its Enter arrives before
  // the pause, which is the case `armed` exists for.

  function pickCombo(combo: Combo) {
    if (onPickCombo === undefined) return;
    onPickCombo(combo);
    pushQuery.cancel();
    setInput("");
    setQuery("");
    searchRef.current?.focus();
  }

  function pickHit(hit: SearchHit) {
    if (hit.kind === "listing") addListing(hit.listing);
    else pickCombo(hit.combo);
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
      case "no":
        if (selection.row.kind === "card") openDetail(selection.row.cardId);
        return;
      case "image":
        // The photo is a cell the cursor can stand on; Enter opens the gallery.
        if (selection.row.kind === "card") openImages(selection.row.cardId);
        return;
      case "grip":
        if (selection.row.kind === "card") lockCard(selection.row.cardId);
        return;
      default:
        return; // the listing's grandTotal is selectable but does nothing
    }
  }

  /**
   * The number cell: the product behind this line, read-only.
   *
   * The line only has to know which *listing* it holds. A cart copied back out of
   * a saved record is rebuilt from `record_listings` — listing, name, price,
   * discounts — and carries no product id, because that is UI state with no
   * column behind it. Opening used to demand a product id and so did nothing at
   * all on such a cart. The sheet reads the product from the listing when it
   * opens (see `ProductDetailDialog`), so the fetch is paid for by the click, not
   * by the copy. Only a hand-typed line — no listing either — has no sheet.
   */
  function openDetail(cardId: string) {
    const line = latest.current.lines.find((candidate) => candidate.id === cardId);
    if (line === undefined) return;
    const productId = line.productId ?? null;
    const listingId = line.listingId ?? null;
    if (productId === null && listingId === null) return;
    setDetailFor({ productId, listingId });
  }

  /**
   * The card's photo: the product's gallery. It opens on the cover the line is
   * drawn with, so the sheet never starts on a photo the operator was not already
   * looking at, and it opens before the read: the cover is a photo of the product
   * whether or not the rest of the gallery answers.
   */
  function openImages(cardId: string) {
    const line = latest.current.lines.find((candidate) => candidate.id === cardId);
    if (line === undefined) return;
    setImagesFor({ productId: line.productId ?? null, cover: line.cover ?? null });
  }

  /** The drag handle's double click: hand the list to the arrow keys. */
  function lockCard(cardId: string) {
    setLocked(cardId);
    // A double click on a plain div moves focus to the body; the arrows only
    // reach this grid while it (or a field inside it) has it.
    containerRef.current?.focus();
  }

  /**
   * A locked card and its neighbours. The move is the same `arrayMove` a drag
   * ends with, so the two ways of reordering cannot disagree — and while a card
   * is locked the list animates its rows (see `moving` on the card), so the card
   * slides to its new place instead of jumping there.
   */
  function moveCard(cardId: string, delta: number) {
    const from = lines.findIndex((line) => line.id === cardId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= lines.length) return;
    onChange(arrayMove(lines, from, to));
    // The card's id did not change, so the scroll-into-view effect that follows
    // the selection will not fire for this move.
    const id = `cell-${cardId}-grip`;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "nearest" }));
  }

  /**
   * Arrow keys inside an open editor: at the very edge of the value the arrow
   * commits what is typed, leaves the editor and moves the cursor — the row of
   * cells is walked without Enter, the way a spreadsheet behaves.
   *
   * Runs in the capture phase on purpose: `InputCurrency` moves its own caret on
   * Left/Right, so by the bubble phase a caret that was one step in is already
   * at the edge and the cell would be left on the first press. In capture the
   * caret is still where the operator left it.
   */
  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (!editing) return;
    const field = event.target;
    if (!(field instanceof HTMLInputElement)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;
    if (!key.startsWith("Arrow")) return;
    if (key === "ArrowLeft" && !caretAtValueStart(field)) return;
    if (key === "ArrowRight" && !caretAtValueEnd(field)) return;
    event.preventDefault();
    // Blur is the editor's own commit; unmounting the input would drop the draft.
    field.blur();
    if (key === "ArrowUp") {
      moveVertical(-1);
      return;
    }
    if (key === "ArrowDown") {
      // Nothing below the last row: hand the selection to the settle strip.
      if (!moveVertical(1)) onExitDown?.();
      return;
    }
    moveHorizontal(key === "ArrowLeft" ? -1 : 1, true);
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
    // A locked card owns the up and down keys: they move the card through the
    // list instead of moving the cursor. Esc — or a click anywhere — lets it go.
    if (locked !== null) {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        setLocked(null);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveCard(locked, event.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (event.key.startsWith("Arrow")) {
        // Left and right would walk the cursor off the card that is moving; the
        // list is holding still until Esc.
        event.preventDefault();
        return;
      }
    }
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
    // A name or a code: any printable character opens the editor with it, the
    // way a spreadsheet does. A digit counts — a code can be all digits.
    const character = active.textSeed === true ? typedCharacter(event) : null;
    if (character !== null) {
      event.preventDefault();
      setSeed(character);
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
          // Land the pause now, then take the list as soon as it is painted: the
          // grid behind it is not where this key was pointing.
          pushQuery.flush();
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
          // On the text, not on the pane: a scan's Enter arrives long before the
          // pause is over, and `pickFirst` knows how to wait for its answer.
          if (typedText !== "") {
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
      onKeyDownCapture={handleKeyDownCapture}
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
      // A click anywhere lets a locked card go: it is how the move ends. Clicks
      // from a dialog's portal bubble through this tree too, and clearing a lock
      // that is already clear is a no-op.
      onClickCapture={() => {
        onActivate?.();
        if (locked !== null) setLocked(null);
      }}
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
            "flex items-center px-1 ",
            layout.stageToggle ? "col-span-8" : "col-span-10",
            focused && isSearch && SELECTED_RING,
          )}
        >
          <Kbd>F1</Kbd>
          <Input
            ref={searchRef}
            type="search"
            className="min-w-0 flex-1 border-0 bg-transparent shadow-none placeholder:italic focus-visible:ring-0"
            placeholder={
              mode === "sale"
                ? "Cari barang atau kombo untuk dijual..."
                : "Cari barang untuk dibeli..."
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
            "col-span-2 flex items-center border-l",
            focused && manualSelected && SELECTED_RING + " bg-muted",
          )}
        >
          <Button
            variant="ghost"
            className="w-full rounded-none h-full"
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
              setSelection({ row: HEADER, col: TOGGLE_COLUMN });
              setEditing(false);
            }}
            className={cn(
              "col-span-2 border-l p-0",
              focused && toggleSelected && SELECTED_RING + " bg-muted",
            )}
          >
            {!showExtraTotal ? (
              <Button
                variant="ghost"
                className="w-full rounded-none h-full"
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
                className="h-auto w-full flex-col items-start gap-0 rounded-none py-0 "
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle?.();
                }}
              >
                <span className="flex items-center gap-1 text-muted-foreground select-none">
                  Tambahan
                  <ArrowRight className="size-5" />
                </span>
                <span className="w-full truncate text-base font-bold tabular-nums">
                  {rupiah(extraTotal)}
                </span>
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <Show
        when={shown}
        fallback={
          <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
            {/* // Held back for the anti-flash window, but keeping its places: the
              // rows are the body of a `flex-1` panel, so the frame does not move
              // either way, and the three rows are already the height of the lines
              // that replace them. */}
            <Show when={loading}>
              <ReservedSkeleton className="divide-y space-y-1 divide-border">
                {Array.from({ length: 3 }).map((_, index) => (
                  // A real cart line is two cell rows: 88 tall.
                  <Skeleton key={index} className="h-[88px] rounded-none w-full" />
                ))}
              </ReservedSkeleton>
            </Show>
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
                          cover={line.cover ?? null}
                          bumped={bumped === line.id}
                          seed={seed}
                          priceLabel={mode === "sale" ? "Harga Jual" : "Harga Beli"}
                          fix={fix}
                          number={lines.length - index}
                          issue={issues.get(line.id)}
                          selected={cardSelected && focused ? (active.field as Field) : null}
                          locked={locked === line.id}
                          moving={locked !== null}
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
        }
      >
        <SearchResults
          res={results}
          containerRef={resultsRef}
          onPick={pickHit}
          onExit={() => searchRef.current?.focus()}
        />
      </Show>

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

      <ProductDetailDialog
        open={detailFor !== null}
        onOpenChange={(open) => {
          if (!open) setDetailFor(null);
        }}
        productId={detailFor?.productId ?? null}
        listingId={detailFor?.listingId ?? null}
      />

      <ProductImagesDialog
        open={imagesFor !== null}
        onOpenChange={(open) => {
          if (!open) setImagesFor(null);
        }}
        productId={imagesFor?.productId ?? null}
        cover={imagesFor?.cover ?? null}
      />
    </div>
  );
}
