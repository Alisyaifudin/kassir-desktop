import { motion } from "motion/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import type Decimal from "decimal.js";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { DUAL_FLAG, type ValueKind } from "~/lib/constants";
import type { Extra } from "~/components/cart/types";
import { rupiah } from "~/components/cart/util-rupiah";
import { Cell, SELECTED_RING } from "~/components/cart/z-Cell";
import type { ExtraField } from "~/components/cart/extra-grid";

const KIND_LABELS: Record<ValueKind, string> = { number: "Angka", percent: "Persen" };

/** Show an extra's rupiah effect with its sign in front, not inside. */
function signedRupiah(value: Decimal): string {
  return value.isNegative() ? `-${rupiah(value.abs())}` : rupiah(value);
}

/**
 * One extra on the purchase, a twelve-column grid row: the number doubles as
 * the drag handle, then the same labelled cell the listing stage uses, with the
 * type as a select, the effective amount read out, a `dual` checkbox and the
 * delete button.
 *
 * `dual` is the extra's `DUAL_FLAG`: a preset arrives with it already set, and
 * the cashier can turn it off (or on) here — it is what makes the sale commit an
 * extras-only twin. The parent owns selection, editing and the open select, so
 * the whole grid can be driven by the arrow keys; the row only renders what it
 * is told.
 */
export function ExtraCard({
  extra,
  number,
  eff,
  selected,
  editing,
  kindOpen,
  onChange,
  onRemove,
  onSelect,
  onStartEdit,
  onEditingDone,
  onKindOpenChange,
}: {
  extra: Extra;
  number: number;
  eff: Decimal;
  selected: ExtraField | null;
  editing: boolean;
  kindOpen: boolean;
  onChange: (patch: Partial<Extra>) => void;
  onRemove: () => void;
  onSelect: (field: ExtraField) => void;
  onStartEdit: (field: ExtraField) => void;
  onEditingDone: () => void;
  onKindOpenChange: (open: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: extra.id,
  });
  const dual = (extra.flag & DUAL_FLAG) !== 0;

  return (
    <motion.div
      ref={setNodeRef}
      role="row"
      aria-label={`Biaya ${extra.name === "" ? number : extra.name}`}
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
      <div role="presentation" className="grid grid-cols-12 items-stretch">
        <div
          className="col-span-1 flex touch-none cursor-grab items-center justify-center text-normal text-muted-foreground tabular-nums select-none active:cursor-grabbing"
          {...listeners}
          {...attributes}
          title="Geser untuk mengubah urutan"
        >
          {number}
          <GripVertical className="icon" />
        </div>
        <Cell
          id={`extra-${extra.id}-name`}
          className="col-span-3 border-l"
          label="Nama"
          selected={selected === "name"}
          editing={editing && selected === "name"}
          value={extra.name}
          display={extra.name}
          empty={extra.name === ""}
          placeholder="Nama biaya"
          onSelect={() => onSelect("name")}
          onStartEdit={() => onStartEdit("name")}
          onEditingDone={onEditingDone}
          onCommit={(raw) => onChange({ name: raw })}
        />
        <Cell
          id={`extra-${extra.id}-value`}
          className="col-span-2 border-l"
          label="Nilai"
          align="right"
          currency={extra.kind === "number"}
          percent={extra.kind === "percent"}
          selected={selected === "value"}
          editing={editing && selected === "value"}
          value={extra.value}
          display={extra.kind === "percent" ? `${extra.value}%` : rupiah(extra.value)}
          empty={extra.value === 0}
          placeholder="0"
          onSelect={() => onSelect("value")}
          onStartEdit={() => onStartEdit("value")}
          onEditingDone={onEditingDone}
          onCommit={(raw) => onChange({ value: Number(raw) || 0 })}
        />
        <div
          id={`extra-${extra.id}-kind`}
          role="gridcell"
          aria-selected={selected === "kind"}
          onClick={() => onSelect("kind")}
          className={cn(
            "col-span-2 flex flex-col justify-center gap-0.5 border-l px-2 py-1",
            selected === "kind" && SELECTED_RING,
          )}
        >
          <span className="text-small leading-none text-muted-foreground select-none">Tipe</span>
          <Select
            value={extra.kind}
            open={kindOpen}
            onOpenChange={onKindOpenChange}
            onValueChange={(kind) => onChange({ kind: kind as ValueKind })}
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
          role="gridcell"
          aria-selected={selected === "eff"}
          onClick={() => onSelect("eff")}
          className={cn(
            "col-span-2 flex flex-col justify-center gap-0.5 border-l px-2 py-1",
            selected === "eff" && SELECTED_RING,
          )}
        >
          <span className="text-small leading-none text-muted-foreground select-none">Efektif</span>
          <span className="text-normal font-bold tabular-nums text-primary">
            {signedRupiah(eff)}
          </span>
        </div>
        <div
          id={`extra-${extra.id}-dual`}
          role="gridcell"
          aria-selected={selected === "dual"}
          onClick={() => onSelect("dual")}
          className={cn(
            "col-span-1 flex flex-col items-center justify-center gap-0.5 border-l px-1 py-1",
            selected === "dual" && SELECTED_RING,
          )}
        >
          <label
            htmlFor={`extra-${extra.id}-dual-box`}
            className="text-small leading-none text-muted-foreground select-none"
          >
            dual
          </label>
          <Checkbox
            id={`extra-${extra.id}-dual-box`}
            checked={dual}
            aria-label={`Tandai biaya ${extra.name === "" ? number : extra.name} sebagai dual`}
            onCheckedChange={(checked) =>
              onChange({ flag: checked === true ? extra.flag | DUAL_FLAG : extra.flag & ~DUAL_FLAG })
            }
          />
        </div>
        <div
          id={`extra-${extra.id}-x`}
          role="gridcell"
          aria-selected={selected === "x"}
          onClick={() => onSelect("x")}
          className={cn(
            "col-span-1 flex items-center justify-center border-l",
            selected === "x" && SELECTED_RING,
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-destructive hover:text-primary-foreground"
            aria-label="Hapus biaya"
            title="Hapus biaya"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <X className="icon" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
