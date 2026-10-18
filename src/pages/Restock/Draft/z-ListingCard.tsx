import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Undo2, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { lineTotal } from "../total";
import { rupiah } from "../util-rupiah";
import type { Line } from "../mock";

/**
 * One line of the purchase, laid out as a twelve-column block: who and how much
 * on top, where and what it costs underneath. Each cell stacks a small label
 * over its value; the grid supplies the lines, so the value itself is borderless
 * and only becomes a field on double-click.
 *
 * A line that came from the catalog keeps its `base` values, so an edited cell
 * is tinted and offers an undo; a hand-entered line has no base and nothing to
 * revert to.
 */
export function ListingCard({
  line,
  number,
  onChange,
  onRemove,
}: {
  line: Line;
  number: number;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const subtotal = lineTotal(line);
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
        <div className="col-span-1 flex items-center justify-center border-r text-small text-muted-foreground tabular-nums select-none">
          {number}
        </div>
        <Cell
          className="col-span-8 border-r"
          label="Nama"
          value={line.name}
          display={line.name}
          empty={line.name === ""}
          placeholder="Nama barang"
          base={line.base?.name}
          onCommit={(raw) => onChange({ name: raw })}
        />
        <div className="col-span-2 flex items-center justify-end border-r px-2 text-big font-bold tabular-nums select-none">
          {rupiah(subtotal)}
        </div>
        <div className="col-span-1 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-destructive hover:text-primary-foreground"
            title="Hapus baris"
            onClick={onRemove}
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
          className="col-span-4 border-r"
          label="Kode"
          value={line.code}
          display={line.code}
          empty={line.code === ""}
          placeholder="Kode"
          base={line.base?.code}
          onCommit={(raw) => onChange({ code: raw })}
        />
        <Cell
          className="col-span-1 border-r"
          label="Kuantitas"
          align="center"
          value={line.qty}
          display={String(line.qty)}
          empty={line.qty === 0}
          placeholder="0"
          onCommit={(raw) => onChange({ qty: Number(raw) || 0 })}
        />
        <Cell
          className="col-span-1 border-r"
          label="Satuan"
          align="center"
          value={line.unit}
          display={`×${line.unit}`}
          empty={line.unit === 0}
          placeholder="0"
          base={line.base?.unit}
          onCommit={(raw) => onChange({ unit: Number(raw) || 0 })}
        />
        <Cell
          className="col-span-2 border-r"
          label="Harga Beli"
          align="right"
          value={line.price}
          display={rupiah(line.price)}
          empty={line.price === 0}
          placeholder="0"
          base={line.base?.price}
          onCommit={(raw) => onChange({ price: Number(raw) || 0 })}
        />
        <div className="col-span-3 flex flex-col justify-center gap-0.5 px-2 py-1">
          <span className="text-small leading-none text-muted-foreground select-none">Diskon</span>
          <DiscountDialog />
        </div>
      </div>
    </Reorder.Item>
  );
}

/** A labelled cell whose value reads as text and becomes an input on double-click. */
function Cell({
  className,
  label,
  value,
  display,
  empty,
  placeholder,
  base,
  onCommit,
  align = "left",
}: {
  className?: string;
  label: string;
  value: string | number;
  display: string;
  empty: boolean;
  placeholder: string;
  base?: string | number;
  onCommit: (raw: string) => void;
  align?: "left" | "right" | "center";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const dirty = base !== undefined && String(value) !== String(base);
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justifyClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-center gap-0.5 px-2 py-1",
        className,
        dirty && "bg-destructive/10",
        // Excel's active cell: a heavy inset border that does not move anything.
        editing && "z-10 ring-2 ring-primary ring-inset",
      )}
    >
      <span className={cn("text-small leading-none text-muted-foreground select-none", alignClass)}>
        {label}
      </span>
      {editing ? (
        <div className="flex items-center gap-1">
          {base !== undefined && draft !== String(base) ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title="Batalkan perubahan"
              // Keep the input focused so its blur does not commit first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onCommit(String(base));
                setEditing(false);
              }}
            >
              <Undo2 className="icon" />
            </Button>
          ) : null}
          <Input
            autoFocus
            value={draft}
            placeholder={placeholder}
            className={cn(
              "h-9 rounded-none border-0 bg-transparent p-0 text-normal shadow-none focus-visible:ring-0 small:h-7",
              alignClass,
            )}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={() => {
              onCommit(draft);
              setEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setEditing(false);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onDoubleClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          title="Klik dua kali untuk mengubah"
          className={cn("flex h-9 w-full items-center text-normal select-none small:h-7", justifyClass)}
        >
          {empty ? <span className="text-muted-foreground">{placeholder}</span> : display}
        </button>
      )}
    </div>
  );
}

/** Where the line's discounts will be stacked and edited; empty for now. */
function DiscountDialog() {
  return (
    <Dialog>
      <Button asChild variant="ghost" className="h-auto w-full justify-start p-0 text-normal">
        <DialogTrigger type="button">
          <Plus className="icon" />
          Tambah
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Diskon</DialogTitle>
          <DialogDescription>Fitur diskon sedang dalam pengembangan.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
