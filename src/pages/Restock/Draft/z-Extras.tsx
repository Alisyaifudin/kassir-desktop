import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import type Decimal from "decimal.js";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kdb";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { generateId } from "~/lib/random";
import type { ValueKind } from "~/lib/constants";
import { EXTRA_PRESETS, type Extra, type ExtraPreset } from "../mock";
import { extraEffective } from "../total";
import { rupiah } from "../util-rupiah";
import { Cell, SELECTED_RING } from "./z-Cell";
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
const SUBTOTAL_ROW: ExtraRowRef = { kind: "subtotal" };
const NAME_COLUMN = 1;
const MANUAL_COLUMN = 10;

const KIND_LABELS: Record<ValueKind, string> = { number: "Angka", percent: "Persen" };

/** A blank extra for +manual: a flat amount with nothing filled in. */
function blankExtra(): Extra {
  return { id: generateId(), name: "", kind: "number", value: 0 };
}

function caretAtEnd(input: HTMLInputElement | null): boolean {
  return input !== null && input.selectionStart === input.value.length;
}

/** Show an extra's rupiah effect with its sign in front, not inside. */
function signedRupiah(value: Decimal): string {
  return value.isNegative() ? `-${rupiah(value.abs())}` : rupiah(value);
}

/**
 * Stage two: the charges on the purchase as a whole — ongkos kirim, a grosir
 * discount, a rounding-off favour. Same grid as the listing stage: the subtotal
 * sits at the top as a row of its own, then one row per extra, each showing
 * what it works out to, because "3%" is not a number a shopkeeper can check at
 * a glance.
 *
 * Unlike a line's discounts there is no trailing empty row; `+manual` or the
 * search add one, and a purchase with no extras at all is fine.
 */
export function Extras({
  extras,
  subtotal,
  onChange,
}: {
  extras: Extra[];
  subtotal: Decimal;
  onChange: (extras: Extra[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<ExtraSelection>({ row: HEADER, col: NAME_COLUMN });
  const [editing, setEditing] = useState(false);
  const [openKindFor, setOpenKindFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const kindWasOpen = useRef(false);

  // While the search bar has text the rows make way for the future results.
  const hidden = query.trim() !== "";
  const ids = useMemo(() => extras.map((extra) => extra.id), [extras]);
  const rows = useMemo(() => extraRowsFor(hidden ? [] : ids), [hidden, ids]);
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
      : selection.row.kind === "subtotal"
        ? "cell-subtotal-subtotal"
        : `extra-${selection.row.extraId}-${active.field}`;

  // A row that was deleted or hidden must not keep the selection.
  useEffect(() => {
    if (hidden && selection.row.kind === "extra") {
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

  function moveVertical(delta: number) {
    const index = rows.findIndex((row) => sameExtraRow(row, selection.row));
    if (index === -1) return;
    const next = rows[index + delta];
    if (next === undefined) return;
    const cell = extraCellAt(next, selection.col);
    setSelection({ row: next, col: extraColumnIn(cell, selection.col) });
    setEditing(false);
  }

  function moveHorizontal(delta: number) {
    const flat = rows.flatMap((row) =>
      selectableExtraCells(row).map((cell) => ({ row, cell })),
    );
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
          ? { row: SUBTOTAL_ROW, col: 0 }
          : { row: { kind: "extra", extraId: next.id }, col: NAME_COLUMN },
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
      case "kind":
        if (selection.row.kind === "extra") setOpenKindFor(selection.row.extraId);
        return;
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
    if (event.defaultPrevented) return;
    // F1 always jumps to the search bar, even out of an edit.
    if (event.key === "F1") {
      event.preventDefault();
      searchRef.current?.focus();
      setSelection({ row: HEADER, col: NAME_COLUMN });
      setEditing(false);
      return;
    }
    if (editing) return;
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
        <ExtraSearch
          presets={results}
          containerRef={resultsRef}
          onPick={addPreset}
          onExit={() => searchRef.current?.focus()}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto scroll-gutter">
          <div className="grid grid-cols-12 border-b">
            <div
              id="cell-subtotal-subtotal"
              onClick={() => {
                setSelection({ row: SUBTOTAL_ROW, col: 0 });
                setEditing(false);
              }}
              className={cn(
                "col-span-12 flex items-center justify-between gap-2 bg-card px-3 py-2 text-card-foreground",
                selection.row.kind === "subtotal" && SELECTED_RING,
              )}
            >
              <span className="text-normal text-muted-foreground select-none">Subtotal Barang</span>
              <span className="text-big font-bold tabular-nums">{rupiah(subtotal)}</span>
            </div>
          </div>

          {extras.length === 0 ? (
            <p className="p-4 text-muted-foreground select-none">Belum ada biaya tambahan.</p>
          ) : (
            <div className="divide-y divide-border">
              {extras.map((extra, index) => {
                const onRow = selection.row.kind === "extra" && selection.row.extraId === extra.id;
                const eff = extraEffective(extra, subtotal);
                return (
                  <div key={extra.id} className="grid grid-cols-12 items-stretch bg-card text-card-foreground">
                    <div className="col-span-1 flex items-center justify-center text-normal text-muted-foreground tabular-nums select-none">
                      {index + 1}
                    </div>
                    <Cell
                      id={`extra-${extra.id}-name`}
                      className="col-span-3 border-l"
                      label="Nama"
                      selected={onRow && active.field === "name"}
                      editing={onRow && editing && active.field === "name"}
                      value={extra.name}
                      display={extra.name}
                      empty={extra.name === ""}
                      placeholder="Nama biaya"
                      onSelect={() => selectExtra(extra.id, "name")}
                      onStartEdit={() => startEditExtra(extra.id, "name")}
                      onEditingDone={() => setEditing(false)}
                      onCommit={(raw) => patchExtra(extra.id, { name: raw })}
                    />
                    <Cell
                      id={`extra-${extra.id}-value`}
                      className="col-span-3 border-l"
                      label="Nilai"
                      align="right"
                      currency={extra.kind === "number"}
                      percent={extra.kind === "percent"}
                      selected={onRow && active.field === "value"}
                      editing={onRow && editing && active.field === "value"}
                      value={extra.value}
                      display={extra.kind === "percent" ? `${extra.value}%` : rupiah(extra.value)}
                      empty={extra.value === 0}
                      placeholder="0"
                      onSelect={() => selectExtra(extra.id, "value")}
                      onStartEdit={() => startEditExtra(extra.id, "value")}
                      onEditingDone={() => setEditing(false)}
                      onCommit={(raw) => patchExtra(extra.id, { value: Number(raw) || 0 })}
                    />
                    <div
                      id={`extra-${extra.id}-kind`}
                      onClick={() => selectExtra(extra.id, "kind")}
                      className={cn(
                        "col-span-2 flex flex-col justify-center gap-0.5 border-l px-2 py-1",
                        onRow && active.field === "kind" && SELECTED_RING,
                      )}
                    >
                      <span className="text-small leading-none text-muted-foreground select-none">
                        Tipe
                      </span>
                      <Select
                        value={extra.kind}
                        open={openKindFor === extra.id}
                        onOpenChange={(open) => setOpenKindFor(open ? extra.id : null)}
                        onValueChange={(kind) => patchExtra(extra.id, { kind: kind as ValueKind })}
                      >
                        <SelectTrigger className="h-9 w-full border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7">
                          <SelectValue>{KIND_LABELS[extra.kind]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="number">Angka</SelectItem>
                            <SelectItem value="percent">Persen</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div
                      id={`extra-${extra.id}-eff`}
                      onClick={() => selectExtra(extra.id, "eff")}
                      className={cn(
                        "col-span-2 flex flex-col justify-center gap-0.5 border-l px-2 py-1",
                        onRow && active.field === "eff" && SELECTED_RING,
                      )}
                    >
                      <span className="text-small leading-none text-muted-foreground select-none">
                        Efektif
                      </span>
                      <span className="text-normal font-bold tabular-nums text-primary">
                        {signedRupiah(eff)}
                      </span>
                    </div>
                    <div
                      id={`extra-${extra.id}-x`}
                      onClick={() => selectExtra(extra.id, "x")}
                      className={cn(
                        "col-span-1 flex items-center justify-center border-l",
                        onRow && active.field === "x" && SELECTED_RING,
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-destructive hover:text-primary-foreground"
                        title="Hapus biaya"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeExtra(extra.id);
                        }}
                      >
                        <X className="icon" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
