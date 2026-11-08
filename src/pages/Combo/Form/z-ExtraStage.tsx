import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Decimal from "decimal.js";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { GripVertical, MoveVertical, PackageOpen, Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { rupiah } from "~/components/cart/util-rupiah";
import { SELECTED_RING, caretAtValueEnd } from "~/components/cart/z-Cell";
import { norm } from "~/lib/search/normalize";
import { cn } from "~/lib/utils";
import {
  COMBO_EXTRA_LAYOUT,
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
import type { Extra } from "~/services/extra";
import { GridHeader } from "./z-GridHeader";

const HEADER: ExtraRowRef = { kind: "header" };

function extraValue(extra: Extra): string {
  return extra.kind === "percent" ? `${extra.value}%` : rupiah(extra.value);
}

function signedRupiah(value: Decimal): string {
  return value.isNegative() ? `-${rupiah(value.abs())}` : rupiah(value);
}

export function ExtraStage({
  extras,
  extraIds,
  effects,
  onAdd,
  onRemove,
  onReorder,
  onPrevious,
  listingCount,
}: {
  extras: Extra[];
  extraIds: string[];
  effects: ReadonlyMap<string, Decimal>;
  onAdd: (extraId: string) => void;
  onRemove: (extraId: string) => void;
  onReorder: (from: number, to: number) => void;
  onPrevious: () => void;
  listingCount: number;
}) {
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState<ExtraSelection>({ row: HEADER, col: 1 });
  const [locked, setLocked] = useState<string | null>(null);
  const [resultSelection, setResultSelection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const byId = useMemo(() => new Map(extras.map((extra) => [extra.id, extra])), [extras]);
  const selectedIds = useMemo(() => new Set(extraIds), [extraIds]);
  const needle = norm(input);
  const matches = useMemo(
    () => extras.filter((extra) => !selectedIds.has(extra.id) && needle !== "" && norm(extra.name).includes(needle)),
    [extras, selectedIds, needle],
  );
  const shown = input.trim() !== "";
  const rows = useMemo(() => extraRowsFor(shown ? [] : extraIds, COMBO_EXTRA_LAYOUT), [shown, extraIds]);
  const active = extraCellAt(selection.row, selection.col, COMBO_EXTRA_LAYOUT);
  const isSearch = selection.row.kind === "header" && active.field === "search";
  const activeId = selection.row.kind === "header"
    ? `cell-header-${active.field}`
    : selection.row.kind === "extra"
      ? `extra-${selection.row.extraId}-${active.field}`
      : "cell-subtotal-subtotal";

  useEffect(() => {
    if (shown && selection.row.kind === "extra") setSelection({ row: HEADER, col: 1 });
  }, [shown, selection.row]);
  useEffect(() => {
    if (selection.row.kind === "extra" && !extraIds.includes(selection.row.extraId)) {
      setSelection({ row: HEADER, col: 1 });
    }
  }, [extraIds, selection.row]);
  useEffect(() => {
    if (locked !== null && !extraIds.includes(locked)) setLocked(null);
  }, [extraIds, locked]);
  useEffect(() => {
    if (isSearch) searchRef.current?.focus();
    else containerRef.current?.focus();
  }, [selection, isSearch]);
  useEffect(() => {
    setResultSelection(0);
  }, [matches]);

  function selectField(row: ExtraRowRef, field: ExtraField | "search" | "toggle") {
    const col = row.kind === "header"
      ? (field === "search" ? 1 : 10)
      : startOfExtraField(field as ExtraField, COMBO_EXTRA_LAYOUT);
    setSelection({ row, col });
  }

  function moveVertical(delta: number): boolean {
    const index = rows.findIndex((row) => sameExtraRow(row, selection.row));
    if (index === -1) return false;
    const next = rows[index + delta];
    if (next === undefined) return false;
    const cell = extraCellAt(next, selection.col, COMBO_EXTRA_LAYOUT);
    setSelection({ row: next, col: extraColumnIn(cell, selection.col) });
    return true;
  }

  function moveHorizontal(delta: number) {
    const flat = rows.flatMap((row) => selectableExtraCells(row, COMBO_EXTRA_LAYOUT).map((cell) => ({ row, cell })));
    const index = flat.findIndex((item) => sameExtraRow(item.row, selection.row) && item.cell.field === active.field);
    const next = flat[index + delta];
    if (next !== undefined) setSelection({ row: next.row, col: next.cell.start });
  }

  function moveExtra(extraId: string, delta: -1 | 1) {
    const from = extraIds.indexOf(extraId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= extraIds.length) return;
    onReorder(from, to);
    requestAnimationFrame(() => document.getElementById(`extra-${extraId}-grip`)?.scrollIntoView({ block: "nearest" }));
  }

  function lockExtra(extraId: string) {
    setLocked(extraId);
    containerRef.current?.focus();
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.over === null || event.active.id === event.over.id) return;
    const from = extraIds.indexOf(String(event.active.id));
    const to = extraIds.indexOf(String(event.over.id));
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  function add(extraId: string) {
    onAdd(extraId);
    setInput("");
    setSelection({ row: HEADER, col: 1 });
    searchRef.current?.focus();
  }

  function remove(extraId: string) {
    const index = extraIds.indexOf(extraId);
    onRemove(extraId);
    if (selection.row.kind === "extra" && selection.row.extraId === extraId) {
      const nextId = extraIds[index + 1] ?? extraIds[index - 1];
      setSelection(nextId === undefined
        ? { row: HEADER, col: 1 }
        : { row: { kind: "extra", extraId: nextId }, col: startOfExtraField("name", COMBO_EXTRA_LAYOUT) });
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && shown) {
      event.preventDefault();
      resultsRef.current?.focus();
    } else if (event.key === "Enter" && shown) {
      event.preventDefault();
      const extra = matches[resultSelection];
      if (extra !== undefined) add(extra.id);
    }
  }

  function handleResultKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (matches.length === 0) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setResultSelection((index) => Math.min(index + 1, matches.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (resultSelection === 0) searchRef.current?.focus();
        else setResultSelection((index) => Math.max(index - 1, 0));
        return;
      case "Enter":
        event.preventDefault();
        if (matches[resultSelection] !== undefined) add(matches[resultSelection]!.id);
        return;
      case "Escape":
        event.preventDefault();
        searchRef.current?.focus();
        return;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.target as Node) || event.defaultPrevented) return;
    if ((event.ctrlKey || event.metaKey) && selection.row.kind === "extra" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      moveExtra(selection.row.extraId, event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;
    if (locked !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        setLocked(null);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveExtra(locked, event.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
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
        if (isSearch && shown) {
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
        if (isSearch && searchRef.current !== null && !caretAtValueEnd(searchRef.current)) return;
        event.preventDefault();
        moveHorizontal(1);
        return;
      case "Enter":
        if (isSearch) {
          if (shown) {
            event.preventDefault();
            const extra = matches[resultSelection];
            if (extra !== undefined) add(extra.id);
          }
          return;
        }
        event.preventDefault();
        if (selection.row.kind === "header" && active.field === "toggle") {
          onPrevious();
          return;
        }
        if (selection.row.kind === "extra" && active.field === "x") remove(selection.row.extraId);
        return;
    }
  }

  const ids = extraIds;
  const toggleSelected = selection.row.kind === "header" && active.field === "toggle";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="grid"
      aria-label="Biaya dan potongan combo"
      aria-activedescendant={activeId}
      onKeyDown={handleKeyDown}
      onClickCapture={() => { if (locked !== null) setLocked(null); }}
      className="flex h-full min-h-0 flex-col overflow-hidden outline-none"
    >
      <GridHeader
        input={input}
        searchRef={searchRef}
        placeholder="Cari biaya atau potongan..."
        nextLabel="Listing"
        compactLabel="List"
        nextCount={listingCount}
        direction="left"
        searchSelected={isSearch}
        toggleSelected={toggleSelected}
        onSearchChange={setInput}
        onSearchKeyDown={handleSearchKeyDown}
        onSelectSearch={() => selectField(HEADER, "search")}
        onToggle={onPrevious}
        onSelectToggle={() => selectField(HEADER, "toggle")}
      />
      {shown ? (
        <div ref={resultsRef} tabIndex={0} onKeyDown={handleResultKeyDown} className="min-h-0 flex-1 overflow-y-auto outline-none">
          {matches.length === 0 ? (
            <p className="p-4 text-muted-foreground">Tidak ada biaya atau potongan yang cocok.</p>
          ) : (
            <div className="divide-y divide-border">
              {matches.map((extra, index) => (
                <button
                  key={extra.id}
                  type="button"
                  onClick={() => add(extra.id)}
                  onMouseEnter={() => setResultSelection(index)}
                  className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/50", index === resultSelection && "bg-primary/10")}
                >
                  <span className="min-w-0 truncate text-base font-medium">{extra.name}</span>
                  <span className="flex shrink-0 items-center gap-3 tabular-nums">
                    <span>{extraValue(extra)}</span>
                    <Plus className="size-5" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : extraIds.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <PackageOpen className="size-10" aria-hidden="true" />
          <p className="text-sm">Cari biaya atau potongan di atas untuk menyusunnya.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {extraIds.map((extraId, index) => {
                    const extra = byId.get(extraId);
                    const selectedRow = selection.row.kind === "extra" && selection.row.extraId === extraId;
                    return (
                      <ComboExtraRow
                        key={extraId}
                        extraId={extraId}
                        extra={extra}
                        number={index + 1}
                        effect={effects.get(extraId)}
                        selected={selectedRow ? active.field as ExtraField : null}
                        locked={locked === extraId}
                        moving={locked !== null}
                        onSelect={(field) => selectField({ kind: "extra", extraId }, field)}
                        onRemove={() => remove(extraId)}
                        onLock={() => lockExtra(extraId)}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function ComboExtraRow({
  extraId,
  extra,
  number,
  effect,
  selected,
  locked,
  moving,
  onSelect,
  onRemove,
  onLock,
}: {
  extraId: string;
  extra: Extra | undefined;
  number: number;
  effect: Decimal | undefined;
  selected: ExtraField | null;
  locked: boolean;
  moving: boolean;
  onSelect: (field: ExtraField) => void;
  onRemove: () => void;
  onLock: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: extraId });
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
        <div
          {...listeners}
          {...attributes}
          id={`extra-${extraId}-no`}
          role="gridcell"
          onDoubleClick={onLock}
          title={locked ? "↑ ↓ memindahkan, Esc untuk selesai" : "Geser untuk mengubah urutan"}
          className="col-span-1 flex touch-none cursor-grab items-center justify-center border-r text-muted-foreground active:cursor-grabbing"
        >
          {locked ? <MoveVertical className="size-5" /> : <GripVertical className="size-5" />}
          <span className="sr-only">{number}</span>
        </div>
        <ExtraStaticCell id={`extra-${extraId}-name`} field="name" col="col-span-3" label="Nama" value={extra?.name ?? "Biaya atau potongan tidak tersedia"} selected={selected === "name"} onSelect={onSelect} className="border-r" />
        <ExtraStaticCell id={`extra-${extraId}-value`} field="value" col="col-span-2" label="Nilai" value={extra === undefined ? "—" : extraValue(extra)} selected={selected === "value"} onSelect={onSelect} align="right" className="border-r" />
        <ExtraStaticCell id={`extra-${extraId}-kind`} field="kind" col="col-span-2" label="Tipe" value={extra === undefined ? "—" : extra.kind === "percent" ? "Persen" : "Nominal"} selected={selected === "kind"} onSelect={onSelect} className="border-r" />
        <ExtraStaticCell id={`extra-${extraId}-eff`} field="eff" col="col-span-3" label="Efektif" value={effect === undefined ? "—" : signedRupiah(effect)} selected={selected === "eff"} onSelect={onSelect} align="right" className="border-r" />
        <Button
          type="button"
          variant="ghost"
          id={`extra-${extraId}-x`}
          role="gridcell"
          aria-selected={selected === "x"}
          aria-label={`Hapus ${extra?.name ?? "tambahan"} dari combo`}
          onClick={(event) => { event.stopPropagation(); onRemove(); }}
          className={cn("group col-span-1 flex h-full items-center justify-center rounded-none hover:bg-destructive", selected === "x" && SELECTED_RING)}
        >
          <X className="size-5 group-hover:text-white" />
        </Button>
      </div>
    </motion.div>
  );
}

function ExtraStaticCell({
  id,
  field,
  col,
  label,
  value,
  selected,
  onSelect,
  align = "left",
  className,
}: {
  id: string;
  field: ExtraField;
  col: string;
  label: string;
  value: string;
  selected: boolean;
  onSelect: (field: ExtraField) => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      id={id}
      role="gridcell"
      aria-selected={selected}
      onClick={() => onSelect(field)}
      className={cn("flex min-w-0 flex-col justify-center px-2", col, align === "right" && "text-right", className, selected && SELECTED_RING)}
    >
      <span className="pt-1 text-sm leading-none text-muted-foreground select-none">{label}</span>
      <span className={cn("flex h-7 min-w-0 items-center truncate text-base select-none", align === "right" && "justify-end")}>
        {value}
      </span>
    </div>
  );
}
