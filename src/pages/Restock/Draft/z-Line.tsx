import { GripVertical, Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Field } from "../z-Field";
import { rupiah } from "../util-rupiah";
import type { Line } from "../mock";

/**
 * One line of the purchase.
 *
 * A restock line is *entered*, not picked: the cost and the quantity are known
 * to the person holding the invoice, so both are inputs and the line keeps an
 * undo affordance for the catalog price. The sale screen's read-only variant
 * has no counterpart here — there is nothing to trust the catalog for.
 */
export function Line({ line, index }: { line: Line; index: number }) {
  return (
    <div className="flex gap-4 rounded-xl border bg-card py-1 text-card-foreground shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex flex-none flex-col items-center justify-start gap-2 pt-1">
        <div className="flex size-8 items-center justify-center rounded-full bg-muted/20 text-small font-bold text-muted-foreground">
          {index + 1}
        </div>
        <div className="flex flex-1 cursor-grab items-center">
          <GripVertical className="text-muted-foreground icon" />
        </div>
      </div>

      <div className="min-w-0 flex-1 py-1 pr-1">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <Input
              className="h-9 flex-1"
              defaultValue={line.name}
              placeholder="Nama produk..."
            />
            <div className="flex-none pt-1 text-right text-big font-bold tabular-nums text-primary select-none">
              {rupiah(line.subtotal)}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_160px_160px_110px] items-end gap-1 small:grid-cols-[1fr_120px_120px_90px]">
            <Field label="Kode">
              <Input className="h-9" defaultValue={line.barcode} placeholder="Barcode" />
            </Field>
            <Field label="Harga Beli">
              <Input className="h-9 text-right" defaultValue={line.price} />
            </Field>
            <Field label="Diskon">
              <Discount value={line.discount} />
            </Field>
            <div className="flex items-end gap-2">
              <Field label="Qty" className="flex-1">
                <Input className="h-9 text-center" defaultValue={line.qty} />
              </Field>
              <Button
                variant="destructive"
                size="icon"
                className="mb-0.5 rounded-full"
                title="Hapus baris"
              >
                <X className="icon" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The line's discounts collapse into one trigger; the dialog behind it is where
 * they are stacked and edited.
 */
function Discount({ value }: { value: number }) {
  return (
    <Button
      variant="outline"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-1 px-2 font-medium",
        value !== 0 && "text-primary",
      )}
    >
      <span className="truncate tabular-nums">{value === 0 ? "Diskon" : rupiah(value)}</span>
      <Plus className="shrink-0 opacity-50 icon" />
    </Button>
  );
}
