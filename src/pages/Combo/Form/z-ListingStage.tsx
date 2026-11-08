import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Effect, Stream } from "effect";
import Decimal from "decimal.js";
import { useDebouncedCallback } from "use-debounce";
import { AnimatePresence, motion } from "motion/react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoveVertical, PackageOpen, Plus, X } from "lucide-react";
import { useQuery, type Result } from "~/components/Loader";
import { SearchResults, type SearchError, type SearchHit } from "~/components/cart/z-SearchResults";
import { Cell, SELECTED_RING, caretAtValueEnd, caretAtValueStart, typedDigit } from "~/components/cart/z-Cell";
import { DiscountDialog } from "~/components/cart/z-Discount";
import type { Line as CartLine } from "~/components/cart/types";
import { rupiah } from "~/components/cart/util-rupiah";
import { Button } from "~/components/ui/button";
import { SEARCH_DELAY } from "~/lib/constants";
import { lineDiscountTotal, lineGrandTotal } from "~/lib/purchase";
import {
  COMBO_LISTING_LAYOUT,
  cellAt,
  columnIn,
  rowsFor,
  sameRow,
  selectableCells,
  startOf,
  type Field,
  type RowRef,
  type Selection,
} from "~/components/cart/listing-grid";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import type { Listing, ListingError } from "~/services/listing";
import { deriveComboDiscounts, type ComboComponentDraft, type ComboDiscountDraft } from "./types";
import { GridHeader } from "./z-GridHeader";

const HEADER: RowRef = { kind: "header" };
const SEARCH_COLUMN = 1;

export function ListingStage({
  listings,
  components,
  onAdd,
  onQuantityChange,
  onQuantityCommit,
  onDiscountsChange,
  onRemove,
  onReorder,
  onNext,
  extraCount,
}: {
  listings: Listing[];
  components: ComboComponentDraft[];
  onAdd: (listingId: string) => void;
  onQuantityChange: (listingId: string, quantity: number) => void;
  onQuantityCommit: (listingId: string, quantity: number) => void;
  onDiscountsChange: (listingId: string, discounts: ComboDiscountDraft[]) => void;
  onRemove: (listingId: string) => void;
  onReorder: (from: number, to: number) => void;
  onNext: () => void;
  extraCount: number;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [armed, setArmed] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ row: HEADER, col: SEARCH_COLUMN });
  const [editing, setEditing] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [discountFor, setDiscountFor] = useState<string | null>(null);
  const pushQuery = useDebouncedCallback(setQuery, SEARCH_DELAY);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const wantListFocus = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = useMemo(() => components.map(({ listingId }) => listingId), [components]);
  const selectedIds = useMemo(() => new Set(ids), [ids]);
  const typedText = input.trim();

  // Query through the indexed POS listing service. Matches render in its
  // virtualized card grid; the complete catalogue is never filtered or drawn by
  // this stage.
  const results = useQuery<SearchHit[], ListingError>(
    () => query.trim() === ""
      ? Stream.succeed<SearchHit[]>([])
      : Stream.fromEffect(
          service.listing.get.search(query).pipe(
            Effect.map((matches) =>
              matches
                .filter((listing) => !selectedIds.has(listing.id))
                .map((listing) => ({ kind: "listing" as const, listing })),
            ),
          ),
        ),
    [query, selectedIds],
    { keepPrevious: true },
  );

  const answeredData = useRef<unknown>(null);
  const answeredFor = useRef<string | null>(null);
  const answer: unknown = results.type === "success"
    ? results.data
    : results.type === "error"
      ? results.error
      : undefined;
  if (answer !== undefined && answeredData.current !== answer) {
    answeredData.current = answer;
    answeredFor.current = query;
  }
  const settled = typedText !== "" && (answeredFor.current ?? "").trim() === typedText;
  const [pane, setPane] = useState(false);
  useEffect(() => {
    if (typedText === "") {
      setPane(false);
      wantListFocus.current = false;
    } else if (settled) {
      setPane(true);
    }
  }, [typedText, settled]);
  const shown = typedText !== "" && pane;
  const rows = useMemo(() => rowsFor(shown ? [] : ids), [shown, ids]);
  const discountLine = useMemo<CartLine | null>(() => {
    if (discountFor === null) return null;
    const listing = listings.find((item) => item.id === discountFor);
    const component = components.find((item) => item.listingId === discountFor);
    if (listing === undefined || component === undefined) return null;
    return {
      id: listing.id,
      name: listing.name,
      code: listing.code ?? "",
      unit: listing.unit,
      price: listing.price,
      qty: component.quantity,
      discounts: deriveComboDiscounts(listing.price, component.quantity, component.discounts),
    };
  }, [discountFor, listings, components]);
  const active = cellAt(selection.row, selection.col, COMBO_LISTING_LAYOUT);
  const isSearch = selection.row.kind === "header" && active.field === "search";
  const activeId = selection.row.kind === "header"
    ? `cell-header-${active.field}`
    : `cell-${selection.row.cardId}-${active.field}`;

  useEffect(() => {
    if (shown && selection.row.kind === "card") {
      setSelection({ row: HEADER, col: SEARCH_COLUMN });
      setEditing(false);
      setLocked(null);
    }
  }, [shown, selection.row]);
  useEffect(() => {
    if (selection.row.kind === "card" && !ids.includes(selection.row.cardId)) {
      setSelection({ row: HEADER, col: SEARCH_COLUMN });
      setEditing(false);
    }
  }, [ids, selection.row]);
  useEffect(() => {
    if (locked !== null && !ids.includes(locked)) setLocked(null);
  }, [ids, locked]);
  useEffect(() => {
    if (editing) return;
    if (isSearch) searchRef.current?.focus();
    else containerRef.current?.focus();
  }, [selection, editing, isSearch]);
  useEffect(() => {
    if (!shown || !wantListFocus.current) return;
    wantListFocus.current = false;
    resultsRef.current?.focus();
  }, [shown, results]);

  function clearSearch() {
    pushQuery.cancel();
    setArmed(null);
    setInput("");
    setQuery("");
    searchRef.current?.focus();
  }

  function pick(hit: SearchHit) {
    if (hit.kind !== "listing") return;
    onAdd(hit.listing.id);
    clearSearch();
  }

  function pickFirst() {
    if (input !== query) {
      pushQuery.cancel();
      setQuery(input);
    }
    setArmed(input);
  }

  useEffect(() => {
    if (armed === null || answeredFor.current !== armed) return;
    if (results.type !== "success") {
      setArmed(null);
      return;
    }
    setArmed(null);
    const first = results.data[0];
    if (first?.kind === "listing") pick(first);
    // `pick` reads the latest selected rows and is intentionally not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, query, results]);

  function selectField(row: RowRef, col: number) {
    setSelection({ row, col });
    setSeed(null);
    setEditing(false);
  }

  function selectCardField(listingId: string, field: Field) {
    const row: RowRef = { kind: "card", cardId: listingId, part: partFor(field) };
    selectField(row, startOf(field));
  }

  function moveVertical(delta: number): boolean {
    const index = rows.findIndex((row) => sameRow(row, selection.row));
    if (index === -1) return false;
    const next = rows[index + delta];
    if (next === undefined) return false;
    const cell = cellAt(next, selection.col, COMBO_LISTING_LAYOUT);
    setSelection({ row: next, col: columnIn(cell, selection.col) });
    setSeed(null);
    setEditing(false);
    return true;
  }

  function moveHorizontal(delta: number, wrap = false) {
    const flat = rows.flatMap((row) => selectableCells(row, COMBO_LISTING_LAYOUT).map((cell) => ({ row, cell })));
    const index = flat.findIndex((item) => sameRow(item.row, selection.row) && item.cell.field === active.field);
    const next = flat[index + delta] ?? (wrap ? flat[delta < 0 ? flat.length - 1 : 0] : undefined);
    if (next === undefined) return;
    setSelection({ row: next.row, col: next.cell.start });
    setSeed(null);
    setEditing(false);
  }

  function moveListing(listingId: string, delta: number) {
    const from = ids.indexOf(listingId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= ids.length) return;
    onReorder(from, to);
    requestAnimationFrame(() => document.getElementById(`cell-${listingId}-grip`)?.scrollIntoView({ block: "nearest" }));
  }

  function lockListing(listingId: string) {
    setLocked(listingId);
    containerRef.current?.focus();
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.over === null || event.active.id === event.over.id) return;
    const from = ids.indexOf(String(event.active.id));
    const to = ids.indexOf(String(event.over.id));
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (!editing) return;
    const field = event.target;
    if (!(field instanceof HTMLInputElement)) return;
    if (event.ctrlKey || event.metaKey || event.altKey || !event.key.startsWith("Arrow")) return;
    if (event.key === "ArrowLeft" && !caretAtValueStart(field)) return;
    if (event.key === "ArrowRight" && !caretAtValueEnd(field)) return;
    event.preventDefault();
    field.blur();
    if (event.key === "ArrowUp") moveVertical(-1);
    else if (event.key === "ArrowDown") moveVertical(1);
    else moveHorizontal(event.key === "ArrowLeft" ? -1 : 1, true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.target as Node) || event.defaultPrevented || editing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;
    if (locked !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        setLocked(null);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveListing(locked, event.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        return;
      }
    }
    if (active.field === "qty") {
      const digit = typedDigit(event);
      if (digit !== null) {
        event.preventDefault();
        setSeed(digit);
        setEditing(true);
        return;
      }
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
          pushQuery.flush();
          if (resultsRef.current !== null) resultsRef.current.focus();
          else wantListFocus.current = true;
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
        if (isSearch && !caretAtValueEnd(searchRef.current!)) return;
        event.preventDefault();
        moveHorizontal(1);
        return;
      case "Enter":
        if (isSearch) {
          if (typedText !== "") {
            event.preventDefault();
            pickFirst();
          }
          return;
        }
        event.preventDefault();
        if (selection.row.kind === "header" && active.field === "toggle") {
          onNext();
          return;
        }
        if (selection.row.kind === "card" && active.field === "x") {
          removeListing(selection.row.cardId);
          return;
        }
        if (selection.row.kind === "card" && active.field === "grip") {
          lockListing(selection.row.cardId);
          return;
        }
        if (selection.row.kind === "card" && active.field === "diskon") {
          setDiscountFor(selection.row.cardId);
          return;
        }
        if (selection.row.kind === "card" && active.field === "qty") {
          setSeed(null);
          setEditing(true);
        }
        return;
    }
  }

  function removeListing(listingId: string) {
    const index = ids.indexOf(listingId);
    onRemove(listingId);
    if (selection.row.kind === "card" && selection.row.cardId === listingId) {
      const nextId = ids[index + 1] ?? ids[index - 1];
      setSelection(nextId === undefined
        ? { row: HEADER, col: SEARCH_COLUMN }
        : { row: { kind: "card", cardId: nextId, part: "top" }, col: startOf("name") });
      setSeed(null);
      setEditing(false);
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-label="Listing combo"
      aria-activedescendant={activeId}
      onKeyDownCapture={handleKeyDownCapture}
      onKeyDown={handleKeyDown}
      onClickCapture={() => { if (locked !== null) setLocked(null); }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
    >
      <GridHeader
        input={input}
        searchRef={searchRef}
        placeholder="Cari listing..."
        nextLabel="Tambahan"
        compactLabel="Extra"
        nextCount={extraCount}
        direction="right"
        searchSelected={isSearch}
        toggleSelected={selection.row.kind === "header" && active.field === "toggle"}
        onSearchChange={(value) => {
          setArmed(null);
          setInput(value);
          pushQuery(value);
        }}
        onSelectSearch={() => selectField(HEADER, SEARCH_COLUMN)}
        onToggle={onNext}
        onSelectToggle={() => selectField(HEADER, 10)}
      />
      {shown ? (
        <SearchResults
          res={results as Result<SearchHit[], SearchError>}
          containerRef={resultsRef}
          onPick={pick}
          onExit={() => searchRef.current?.focus()}
        />
      ) : components.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <PackageOpen className="size-10" aria-hidden="true" />
          <p className="text-sm">Cari listing di atas untuk mulai menyusun combo.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {components.map((component, index) => {
                    const selectedRow = selection.row.kind === "card" && selection.row.cardId === component.listingId;
                    const listing = listings.find((item) => item.id === component.listingId);
                    return (
                      <ComboListingRow
                        key={component.listingId}
                        listingId={component.listingId}
                        listing={listing}
                        quantity={component.quantity}
                        discounts={component.discounts}
                        number={index + 1}
                        selected={selectedRow ? active.field as Field : null}
                        editing={selectedRow && editing && active.field === "qty"}
                        seed={seed}
                        locked={locked === component.listingId}
                        moving={locked !== null}
                        onSelect={(field) => selectCardField(component.listingId, field)}
                        onStartEdit={() => { setSeed(null); setEditing(true); }}
                        onEditingDone={() => { setSeed(null); setEditing(false); }}
                        onQuantityChange={(raw) => onQuantityChange(component.listingId, Number(raw) || 0)}
                        onQuantityCommit={(raw) => onQuantityCommit(component.listingId, Number(raw) || 0)}
                        onDiscount={() => setDiscountFor(component.listingId)}
                        onRemove={() => removeListing(component.listingId)}
                        onLock={() => lockListing(component.listingId)}
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
        onChange={(discounts) => {
          if (discountFor === null) return;
          onDiscountsChange(
            discountFor,
            discounts.map(({ id, value, kind }) => ({ id, value, kind })),
          );
        }}
      />
    </div>
  );
}

function partFor(field: Field): "top" | "bottom" {
  return ["grip", "code", "qty", "unit", "price", "diskon"].includes(field) ? "bottom" : "top";
}

function ComboListingRow({
  listingId,
  listing,
  quantity,
  discounts,
  number,
  selected,
  editing,
  seed,
  locked,
  moving,
  onSelect,
  onStartEdit,
  onEditingDone,
  onQuantityChange,
  onQuantityCommit,
  onDiscount,
  onRemove,
  onLock,
}: {
  listingId: string;
  listing: Listing | undefined;
  quantity: number;
  discounts: ComboDiscountDraft[];
  number: number;
  selected: Field | null;
  editing: boolean;
  seed: string | null;
  locked: boolean;
  moving: boolean;
  onSelect: (field: Field) => void;
  onStartEdit: () => void;
  onEditingDone: () => void;
  onQuantityChange: (raw: string) => void;
  onQuantityCommit: (raw: string) => void;
  onDiscount: () => void;
  onRemove: () => void;
  onLock: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: listingId });
  const derived = useMemo(
    () => (listing === undefined ? [] : deriveComboDiscounts(listing.price, quantity, discounts)),
    [listing, quantity, discounts],
  );
  const total = listing === undefined
    ? new Decimal(0)
    : lineGrandTotal({ price: listing.price, qty: quantity, discounts: derived });
  const discountTotal = lineDiscountTotal({ discounts: derived });

  return (
    <motion.div
      ref={setNodeRef}
      role="rowgroup"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      layout={moving ? "position" : false}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn("overflow-hidden bg-card text-card-foreground", isDragging && "relative z-10 shadow-lg", locked && "relative z-10 ring-2 ring-primary ring-inset")}
    >
      <div role="row" className="grid grid-cols-12 items-stretch">
        <StaticCell id={`cell-${listingId}-no`} field="no" align="center" col="col-span-1" value={String(number)} selected={selected === "no"} onSelect={onSelect} className="border-r tabular-nums text-muted-foreground" />
        <StaticCell
          id={`cell-${listingId}-name`}
          field="name"
          col="col-span-8"
          label="Nama"
          value={listing?.name ?? "Listing tidak tersedia"}
          sub={listing === undefined ? undefined : `${listing.productName} · stok ${listing.stock}`}
          selected={selected === "name"}
          onSelect={onSelect}
          className="border-r"
        />
        <div
          id={`cell-${listingId}-grandTotal`}
          role="gridcell"
          aria-selected={selected === "grandTotal"}
          onClick={() => onSelect("grandTotal")}
          className={cn("col-span-2 flex items-center justify-end border-r px-2 text-2xl font-bold tabular-nums select-none", selected === "grandTotal" && SELECTED_RING)}
        >
          {rupiah(total)}
        </div>
        <Button
          type="button"
          variant="ghost"
          id={`cell-${listingId}-x`}
          role="gridcell"
          aria-selected={selected === "x"}
          aria-label={`Hapus ${listing?.name ?? "listing"} dari combo`}
          onClick={(event) => { event.stopPropagation(); onRemove(); }}
          className={cn("group col-span-1 flex h-full items-center justify-center rounded-none hover:bg-destructive", selected === "x" && SELECTED_RING)}
        >
          <X className="size-5 group-hover:text-white" />
        </Button>
      </div>
      <div role="row" className="grid grid-cols-12 items-stretch border-t">
        <div
          {...listeners}
          {...attributes}
          id={`cell-${listingId}-grip`}
          role="gridcell"
          aria-selected={selected === "grip"}
          onClick={() => onSelect("grip")}
          onDoubleClick={onLock}
          title={locked ? "↑ ↓ memindahkan, Esc untuk selesai" : "Geser atau klik dua kali untuk mengunci urutan"}
          className={cn("col-span-1 flex touch-none cursor-grab items-center justify-center border-r text-muted-foreground select-none active:cursor-grabbing", selected === "grip" && SELECTED_RING, locked && "cursor-grabbing text-primary")}
        >
          {locked ? <MoveVertical className="size-5" /> : <GripVertical className="size-5" />}
        </div>
        <StaticCell id={`cell-${listingId}-code`} field="code" col="col-span-4" label="Kode" value={listing?.code ?? "tanpa kode"} selected={selected === "code"} onSelect={onSelect} className="border-r" />
        <Cell
          id={`cell-${listingId}-qty`}
          className="col-span-1 border-r"
          label="Jumlah"
          align="center"
          numeric="integer"
          singleClickEdit
          selected={selected === "qty"}
          editing={editing}
          value={quantity}
          display={String(quantity)}
          empty={quantity === 0}
          placeholder="0"
          ariaLabel={`Jumlah ${listing?.name ?? "listing"}`}
          seed={seed}
          onSelect={() => onSelect("qty")}
          onStartEdit={onStartEdit}
          onEditingDone={onEditingDone}
          onChange={onQuantityChange}
          onCommit={onQuantityCommit}
        />
        <StaticCell id={`cell-${listingId}-unit`} field="unit" col="col-span-1" label="Satuan" value={listing === undefined ? "—" : `×${listing.unit}`} selected={selected === "unit"} onSelect={onSelect} className="border-r" />
        <StaticCell id={`cell-${listingId}-price`} field="price" col="col-span-2" label="Harga jual" value={listing === undefined ? "—" : rupiah(listing.price)} selected={selected === "price"} onSelect={onSelect} align="right" className="border-r" />
        <Button
          type="button"
          variant="ghost"
          id={`cell-${listingId}-diskon`}
          role="gridcell"
          aria-selected={selected === "diskon"}
          onClick={(event) => {
            event.stopPropagation();
            onSelect("diskon");
            onDiscount();
          }}
          className={cn(
            "col-span-3 flex h-fit flex-col items-start justify-center gap-0.5 rounded-none px-2 py-1",
            selected === "diskon" && SELECTED_RING,
          )}
        >
          <span className="text-sm leading-none text-muted-foreground select-none">Diskon</span>
          <span className="flex w-full items-center justify-start gap-1 text-base tabular-nums">
            {discountTotal.gt(0) ? `-${rupiah(discountTotal)}` : <><Plus className="size-5" />Tambah</>}
          </span>
        </Button>
      </div>
    </motion.div>
  );
}

function StaticCell({
  id,
  field,
  col,
  label,
  value,
  sub,
  selected,
  onSelect,
  align = "left",
  className,
}: {
  id: string;
  field: Field;
  col: string;
  label?: string;
  value: string;
  sub?: string;
  selected: boolean;
  onSelect: (field: Field) => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <div
      id={id}
      role="gridcell"
      aria-selected={selected}
      onClick={() => onSelect(field)}
      className={cn(
        col,
        "flex min-w-0 flex-col justify-center px-2",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
        selected && SELECTED_RING,
      )}
    >
      <span className="pt-1 text-sm leading-none text-muted-foreground select-none">{label}</span>
      <span className={cn("flex h-7 min-w-0 items-center truncate text-base select-none", align === "right" && "justify-end", align === "center" && "justify-center")}>
        {value}
      </span>
      {sub === undefined ? null : (
        <span className="truncate text-xs leading-tight text-muted-foreground select-none">{sub}</span>
      )}
    </div>
  );
}
