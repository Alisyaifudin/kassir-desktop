import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { lineDiscountTotal, lineGrandTotal } from "../total";
import { rupiah } from "../util-rupiah";
import type { Line } from "../mock";
import type { Field } from "./listing-grid";
import { Cell, SELECTED_RING } from "./z-Cell";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: line.id,
  });
  const grandTotal = lineGrandTotal(line);
  const discountTotal = lineDiscountTotal(line);

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "overflow-hidden bg-card text-card-foreground",
        isDragging && "relative z-10 shadow-lg",
      )}
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
          label="Harga Jual"
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
        </div>
      </div>
    </motion.div>
  );
}
