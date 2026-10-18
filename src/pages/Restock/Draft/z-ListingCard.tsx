import { useEffect, useState, type KeyboardEvent } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Undo2, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { InputCurrency } from "~/components/ui/input-currency";
import { cn } from "~/lib/utils";
import { lineGrandTotal } from "../total";
import { rupiah } from "../util-rupiah";
import type { Line } from "../mock";
import type { Field } from "./listing-grid";

const SELECTED_RING = "z-10 ring-1 ring-primary ring-inset";
const EDITING_RING = "z-10 ring-2 ring-primary ring-inset";

/** Keep only what a numeric field may hold; everything else is dropped as typed. */
function sanitizeNumeric(raw: string, mode: "integer" | "decimal"): string {
  if (mode === "integer") return raw.replace(/\D/g, "");
  const [whole, ...fraction] = raw.replace(/[^\d.]/g, "").split(".");
  return fraction.length === 0 ? whole : `${whole}.${fraction.join("")}`;
}

/**
 * One line of the purchase, laid out as a twelve-column block: who and how much
 * on top, where and what it costs underneath. Each cell stacks a small label
 * over its value; the grid supplies the lines, so the value itself is borderless
 * and only becomes a field when the cell is put into edit mode.
 *
 * The parent owns selection and editing, so the whole grid can be driven by the
 * arrow keys; a cell only renders what it is told.
 */
export function ListingCard({
  line,
  number,
  selected,
  editing,
  onChange,
  onRemove,
  onDiscount,
  onSelect,
  onStartEdit,
  onEditingDone,
}: {
  line: Line;
  number: number;
  selected: Field | null;
  editing: boolean;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  onDiscount: () => void;
  onSelect: (field: Field) => void;
  onStartEdit: (field: Field) => void;
  onEditingDone: () => void;
}) {
  const controls = useDragControls();
  const grandTotal = lineGrandTotal(line);
  return (
    <Reorder.Item
      value={line.id}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-card text-card-foreground"
    >
      <div className="grid grid-cols-12 items-stretch">
        <div className="col-span-1 flex items-center justify-center border-r text-normal text-muted-foreground tabular-nums select-none">
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
          onSelect={() => onSelect("name")}
          onStartEdit={() => onStartEdit("name")}
          onEditingDone={onEditingDone}
          onCommit={(raw) => onChange({ name: raw })}
        />
        <div
          id={`cell-${line.id}-grandTotal`}
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
          onClick={() => onSelect("x")}
          className={cn(
            "col-span-1 flex items-center justify-center",
            selected === "x" && SELECTED_RING,
          )}
        >
          <Button
            variant="ghost"
            size="icon"
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

      <div className="grid grid-cols-12 items-stretch border-t">
        <div
          className="col-span-1 flex cursor-grab items-center justify-center border-r text-muted-foreground active:cursor-grabbing"
          onPointerDown={(event) => controls.start(event)}
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
          onSelect={() => onSelect("code")}
          onStartEdit={() => onStartEdit("code")}
          onEditingDone={onEditingDone}
          onCommit={(raw) => onChange({ code: raw })}
        />
        <Cell
          id={`cell-${line.id}-qty`}
          className="col-span-1 border-r"
          label="Kuantitas"
          align="center"
          numeric="integer"
          selected={selected === "qty"}
          editing={editing && selected === "qty"}
          value={line.qty}
          display={String(line.qty)}
          empty={line.qty === 0}
          placeholder="0"
          onSelect={() => onSelect("qty")}
          onStartEdit={() => onStartEdit("qty")}
          onEditingDone={onEditingDone}
          onCommit={(raw) => onChange({ qty: Number(raw) || 0 })}
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
          onSelect={() => onSelect("unit")}
          onStartEdit={() => onStartEdit("unit")}
          onEditingDone={onEditingDone}
          onCommit={(raw) => onChange({ unit: Number(raw) || 0 })}
        />
        <Cell
          id={`cell-${line.id}-price`}
          className="col-span-2 border-r"
          label="Harga Beli"
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
              onDiscount();
            }}
          >
            <Plus className="icon" />
            Tambah
          </Button>
        </div>
      </div>
    </Reorder.Item>
  );
}

/** A labelled cell whose value becomes an input while the parent says so. */
function Cell({
  id,
  className,
  label,
  selected,
  editing,
  value,
  display,
  empty,
  placeholder,
  base,
  numeric,
  currency,
  onCommit,
  onSelect,
  onStartEdit,
  onEditingDone,
  align = "left",
}: {
  id: string;
  className?: string;
  label: string;
  selected: boolean;
  editing: boolean;
  value: string | number;
  display: string;
  empty: boolean;
  placeholder: string;
  base?: string | number;
  numeric?: "integer" | "decimal";
  currency?: boolean;
  onCommit: (raw: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditingDone: () => void;
  align?: "left" | "right" | "center";
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (editing) setDraft(String(value));
  }, [editing, value]);
  // The tint follows what is on screen: the draft while editing, the committed
  // value otherwise. The undo affordance is the draft's own divergence.
  const canUndo = base !== undefined && draft !== String(base);
  const changed =
    base !== undefined && (editing ? draft !== String(base) : String(value) !== String(base));
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justifyClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const editClass =
    "h-9 rounded-none border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7";

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      onCommit(draft);
      onEditingDone();
      return;
    }
    if (event.key === "Escape") {
      onEditingDone();
      return;
    }
    // Ctrl/Cmd+Z is the undo button, from the keyboard.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && canUndo) {
      event.preventDefault();
      setDraft(String(base));
      onCommit(String(base));
    }
  }

  function handleEditBlur() {
    onCommit(draft);
    onEditingDone();
  }

  return (
    <div
      id={id}
      onClick={() => {
        if (!editing) onSelect();
      }}
      onDoubleClick={onStartEdit}
      title={editing ? undefined : "Klik dua kali untuk mengubah"}
      className={cn(
        "relative flex flex-col justify-center gap-0.5 px-2 py-1",
        className,
        changed && "bg-destructive/10",
        selected && (editing ? EDITING_RING : SELECTED_RING),
      )}
    >
      <span className={cn("text-small leading-none text-muted-foreground select-none", alignClass)}>
        {label}
      </span>
      {editing ? (
        <div className="flex items-center gap-1">
          {canUndo ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title="Batalkan perubahan"
              // Keep the input focused so its blur does not commit first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                // Revert and stay in the field: undo is not how you leave it.
                setDraft(String(base));
                onCommit(String(base));
              }}
            >
              <Undo2 className="icon" />
            </Button>
          ) : null}
          {currency ? (
            <InputCurrency
              autoFocus
              value={Number(draft) || 0}
              onValueChange={(next) => setDraft(String(next))}
              className={cn(editClass, alignClass)}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          ) : (
            <Input
              autoFocus
              value={draft}
              placeholder={placeholder}
              className={cn(editClass, alignClass, "placeholder:italic")}
              onChange={(event) =>
                setDraft(
                  numeric === undefined
                    ? event.currentTarget.value
                    : sanitizeNumeric(event.currentTarget.value, numeric),
                )
              }
              inputMode={numeric === "integer" ? "numeric" : undefined}
              onBlur={handleEditBlur}
              onKeyDown={handleEditKeyDown}
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "flex h-9 w-full items-center text-normal select-none small:h-7",
            justifyClass,
          )}
        >
          {empty ? <span className="text-muted-foreground italic">{placeholder}</span> : display}
        </button>
      )}
    </div>
  );
}

/** Where the line's discounts will be stacked and edited; empty for now. */
export function DiscountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Diskon</DialogTitle>
          <DialogDescription>Fitur diskon sedang dalam pengembangan.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
