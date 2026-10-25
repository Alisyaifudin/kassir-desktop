import { memo, useRef } from "react";
import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { lineDiscountTotal, lineGrandTotal } from "~/lib/purchase";
import { rupiah } from "~/components/cart/util-rupiah";
import type { Line } from "~/components/cart/types";
import {
  Cell,
  EDITING_RING,
  SELECTED_RING,
  useEditorDraft,
  useSelectAllOnEdit,
} from "~/components/cart/z-Cell";
import type { LineIssue } from "~/components/cart/code-issues";
import { CodeIssueView, FieldIssue } from "~/components/cart/z-Issue";

/**
 * One line of a cart, shared by the sale (Pos) and the purchase (Restock)
 * screens, laid out as a twelve-column block: who and how much on top, where
 * and what it costs underneath. Each cell stacks a small label over its value;
 * the grid supplies the lines, so the value itself is borderless and only
 * becomes a field when the cell is put into edit mode.
 *
 * The parent owns selection and editing, so the whole grid can be driven by the
 * arrow keys; a cell only renders what it is told.
 *
 * The two screens differ only in wording — a purchase reads the line's cost as
 * `Harga Beli` — so the label is a prop rather than a second copy of the file.
 */

/** The editable cells of a cart line. Both grids ship this same set. */
type Field = "name" | "grandTotal" | "x" | "code" | "qty" | "unit" | "price" | "diskon";

/** The three sub-cells inside `Kuantitas`: `-`, the value, `+`. */
type QtySub = "left" | "value" | "right";
export const ListingCard = memo(function ListingCard({
  line,
  number,
  issue,
  selected,
  editing,
  priceLabel,
  onChange,
  onRemove,
  onDiscount,
  onSelect,
  onStartEdit,
  onEditingDone,
  selectedSub,
  bumped = false,
  seed,
}: {
  line: Line;
  number: number;
  issue?: LineIssue;
  selected: Field | null;
  selectedSub?: QtySub;
  editing: boolean;
  /**
   * The line was just taken again from the search and moved to the top of the
   * list: it slides into place, so the eye finds it rather than having to trust
   * that the qty went up somewhere down there.
   */
  bumped?: boolean;
  /** A digit typed while a cell was selected: that cell's editor opens with it. */
  seed?: string | null;
  /** `Harga Jual` on the sale screen, `Harga Beli` on the purchase screen. */
  priceLabel: string;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  onDiscount: () => void;
  onSelect: (field: Field, sub?: QtySub) => void;
  onStartEdit: (field: Field) => void;
  onEditingDone: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: line.id,
  });
  const grandTotal = lineGrandTotal(line);
  const discountTotal = lineDiscountTotal(line);

  return (
    <motion.div
      ref={setNodeRef}
      data-testid="cart-line"
      // One line is a row group of two grid rows (goods on top, cost below), so
      // the active descendant points at a real gridcell inside a real row.
      role="rowgroup"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "overflow-hidden bg-card text-card-foreground",
        isDragging && "relative z-10 shadow-lg",
        // A redraw of this card with the flag means "this is the one you scanned"
        // — a translate, not a fade: `animate-in` also animates opacity, and the
        // card's own opacity is owned by motion.
        bumped && "animate-in slide-in-from-top-4 duration-300 ease-out",
      )}
    >
      <div role="row" className="grid grid-cols-12 items-stretch">
        <div
          role="gridcell"
          aria-selected={false}
          className="col-span-1 flex items-center justify-center border-r text-normal text-muted-foreground tabular-nums select-none"
        >
          {number}
        </div>
        <Cell
          id={`cell-${line.id}-name`}
          className="col-span-8 border-r"
          label="Nama"
          selected={selected === "name"}
          editing={editing && selected === "name"}
          value={line.name}
          display={line.name}
          empty={line.name === ""}
          placeholder="Nama barang"
          base={line.base?.name}
          footer={issue?.name === true ? <FieldIssue>Nama barang harus diisi</FieldIssue> : undefined}
          onSelect={() => onSelect("name")}
          onStartEdit={() => onStartEdit("name")}
          onEditingDone={onEditingDone}
          seed={seed}
          onCommit={(raw) => onChange({ name: raw })}
        />
        <div
          id={`cell-${line.id}-grandTotal`}
          role="gridcell"
          aria-selected={selected === "grandTotal"}
          onClick={() => onSelect("grandTotal")}
          className={cn(
            "col-span-2 flex items-center justify-end border-r px-2 text-big font-bold tabular-nums select-none",
            selected === "grandTotal" && SELECTED_RING,
          )}
        >
          {rupiah(grandTotal)}
        </div>
        <div
          id={`cell-${line.id}-x`}
          role="gridcell"
          aria-selected={selected === "x"}
          onClick={() => onSelect("x")}
          className={cn(
            "col-span-1 flex items-center justify-center",
            selected === "x" && SELECTED_RING,
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Hapus baris"
            className="rounded-full hover:bg-destructive hover:text-primary-foreground"
            title="Hapus baris"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <X className="icon" />
          </Button>
        </div>
      </div>

      <div role="row" className="grid grid-cols-12 items-stretch border-t">
        <div
          className="col-span-1 flex touch-none cursor-grab items-center justify-center border-r text-muted-foreground select-none active:cursor-grabbing"
          {...listeners}
          {...attributes}
          title="Geser untuk mengubah urutan"
        >
          <GripVertical className="icon" />
        </div>
        <Cell
          id={`cell-${line.id}-code`}
          className="col-span-4 border-r"
          label="Kode"
          selected={selected === "code"}
          editing={editing && selected === "code"}
          value={line.code}
          display={line.code}
          empty={line.code === ""}
          placeholder="Kode barang"
          base={line.base?.code}
          footer={issue?.code === undefined ? undefined : <CodeIssueView issue={issue.code} />}
          onSelect={() => onSelect("code")}
          onStartEdit={() => onStartEdit("code")}
          onEditingDone={onEditingDone}
          seed={seed}
          onCommit={(raw) => onChange({ code: raw })}
        />
        <QtyCell
          line={line}
          seed={seed}
          selected={selected === "qty"}
          selectedSub={selectedSub ?? "value"}
          editing={editing && selected === "qty"}
          onChange={onChange}
          onSelect={(sub) => onSelect("qty", sub)}
          onStartEdit={() => onStartEdit("qty")}
          onEditingDone={onEditingDone}
        />
        <Cell
          id={`cell-${line.id}-unit`}
          className="col-span-1 border-r"
          label="Satuan"
          align="center"
          numeric="integer"
          selected={selected === "unit"}
          editing={editing && selected === "unit"}
          value={line.unit}
          display={`×${line.unit}`}
          empty={line.unit === 0}
          placeholder="0"
          base={line.base?.unit}
          footer={issue?.unit === true ? <FieldIssue>Satuan minimal 1</FieldIssue> : undefined}
          onSelect={() => onSelect("unit")}
          onStartEdit={() => onStartEdit("unit")}
          onEditingDone={onEditingDone}
          seed={seed}
          onCommit={(raw) => onChange({ unit: Number(raw) || 0 })}
        />
        <Cell
          id={`cell-${line.id}-price`}
          className="col-span-2 border-r"
          label={priceLabel}
          align="right"
          currency
          selected={selected === "price"}
          editing={editing && selected === "price"}
          value={line.price}
          display={rupiah(line.price)}
          empty={line.price === 0}
          placeholder="0"
          base={line.base?.price}
          onSelect={() => onSelect("price")}
          onStartEdit={() => onStartEdit("price")}
          onEditingDone={onEditingDone}
          seed={seed}
          onCommit={(raw) => onChange({ price: Number(raw) || 0 })}
        />
        <div
          id={`cell-${line.id}-diskon`}
          onClick={() => onSelect("diskon")}
          className={cn(
            "col-span-3 flex flex-col justify-center gap-0.5 px-2 py-1",
            selected === "diskon" && SELECTED_RING,
          )}
        >
          <span className="text-small leading-none text-muted-foreground select-none">Diskon</span>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start p-0 text-normal"
            onClick={(event) => {
              event.stopPropagation();
              onSelect("diskon");
              onDiscount();
            }}
          >
            {discountTotal.gt(0) ? (
              `-${rupiah(discountTotal)}`
            ) : (
              <>
                <Plus className="icon" />
                Tambah
              </>
            )}
          </Button>
          {issue?.discount === true ? (
            <FieldIssue>Diskon melebihi harga barang</FieldIssue>
          ) : undefined}
        </div>
      </div>
    </motion.div>
  );
});

/**
 * The quantity cell, laid out as its own little sub-grid: `‹`, the value, `›`.
 * The empty arrows bump the line by one and never enter edit mode; the value
 * (or its label) is what opens the editor, on a double click.
 */
function QtyCell({
  line,
  seed,
  selected,
  selectedSub,
  editing,
  onChange,
  onSelect,
  onStartEdit,
  onEditingDone,
}: {
  line: Line;
  seed?: string | null;
  selected: boolean;
  selectedSub: QtySub;
  editing: boolean;
  onChange: (patch: Partial<Line>) => void;
  onSelect: (sub: QtySub) => void;
  onStartEdit: () => void;
  onEditingDone: () => void;
}) {
  const [draft, setDraft] = useEditorDraft(editing, String(line.qty), seed);
  const cellRef = useRef<HTMLDivElement>(null);
  useSelectAllOnEdit(editing, cellRef);

  function setQty(qty: number) {
    // The grid re-derives the line's discount stack from the new qty (see
    // `patchLine` in z-Listing), so a quantity edit cannot leave a `pcs`
    // discount at the old count.
    onChange({ qty: Math.max(0, qty) });
  }

  function commit() {
    setQty(Number(draft) || 0);
    onEditingDone();
  }

  return (
    <div
      ref={cellRef}
      id={`cell-${line.id}-qty`}
      role="gridcell"
      aria-selected={selected}
      className={cn(
        "relative flex flex-col justify-center gap-0.5 border-r px-1 py-1",
        editing && EDITING_RING,
      )}
    >
      <span
        onClick={() => onSelect("value")}
        onDoubleClick={onStartEdit}
        className="text-small leading-none text-muted-foreground select-none text-center"
      >
        Kuantitas
      </span>
      {editing ? (
        <Input
          autoFocus
          value={draft}
          inputMode="numeric"
          onChange={(event) => setDraft(event.currentTarget.value.replace(/\D/g, ""))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onEditingDone();
            }
          }}
          className="h-9 rounded-none border-0 bg-transparent p-0 text-center text-normal shadow-none focus-visible:ring-0 small:h-7"
        />
      ) : (
        <div className="flex items-center justify-between gap-0.5">
          <button
            type="button"
            tabIndex={-1}
            title="Kurangi"
            onClick={(event) => {
              event.stopPropagation();
              onSelect("left");
              setQty(line.qty - 1);
            }}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent",
              selected && selectedSub === "left" && SELECTED_RING,
            )}
          >
            <ChevronLeft className="icon" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onSelect("value")}
            onDoubleClick={onStartEdit}
            className={cn(
              "min-w-0 flex-1 truncate rounded-sm text-center text-normal tabular-nums",
              selected && selectedSub === "value" && SELECTED_RING,
            )}
          >
            {line.qty}
          </button>
          <button
            type="button"
            tabIndex={-1}
            title="Tambah"
            onClick={(event) => {
              event.stopPropagation();
              onSelect("right");
              setQty(line.qty + 1);
            }}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent",
              selected && selectedSub === "right" && SELECTED_RING,
            )}
          >
            <ChevronRight className="icon" />
          </button>
        </div>
      )}
    </div>
  );
}
