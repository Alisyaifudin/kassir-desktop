import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { Undo2 } from "lucide-react";
import { Discount } from "./z-Discount";
import { PriceInput } from "./z-PriceInput";
import { QtyInput } from "./z-QtyInput";
import { Delete } from "./z-Delete";
import { tx } from "~/transaction-effect";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { memo, useRef } from "react";
import { useFix } from "../../use-transaction";
import { productsStore, useProduct } from "../../store/product";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { BarcodeInput } from "./z-BarcodeInput";
import { queue } from "../../util-queue";

export const Editable = memo(function Editable({ id }: { id: string }) {
  const { name, barcode, discounts, price, qty, total, product, error } = useProduct(id);
  const fix = useFix();
  const alreadyExist = product !== undefined;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <NameInput id={id} name={name} productName={product?.name} />
        </div>
        <div className="flex-none text-right">
          <div className="text-big font-bold text-primary tabular-nums">
            Rp{Number(total.toFixed(fix)).toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_160px_160px_110px] small:grid-cols-[1fr_120px_120px_90px] gap-1 items-end">
        <div className="col-span-1">
          <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
            Kode
          </div>
          <BarcodeInput id={id} fix={fix} alreadyExist={alreadyExist} barcode={barcode} />
        </div>

        <div className="col-span-1">
          <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
            Harga Satuan
          </div>
          <PriceInput id={id} price={price} productPrice={product?.price} />
        </div>

        <div className="col-span-1">
          <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
            Diskon
          </div>
          <Discount id={id} discounts={discounts} />
        </div>

        <div className="col-span-1 flex items-end gap-2">
          <div className="flex-1">
            <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
              Qty
            </div>
            <QtyInput id={id} qty={qty} />
          </div>
          <div className="pb-1 pr-1 flex items-center">
            <Delete id={id} />
          </div>
        </div>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
});

const NameInput = memo(function NameInput({
  id,
  name,
  productName,
}: {
  id: string;
  name: string;
  productName?: string;
}) {
  const fix = useFix();
  const ref = useRef<HTMLInputElement>(null);
  const undo = productName !== undefined && productName !== name;
  const undoName = () => {
    const name = productName;
    if (name === undefined) return;
    productsStore.trigger.updateProduct({
      id,
      recipe: (draft) => {
        draft.name = name;
      },
    });
    queue.add(tx.product.update.name(id, name));
    ref.current?.focus();
  };
  const save = useDebouncedCallback((v: string) => {
    queue.add(tx.product.update.name(id, v));
  }, DEBOUNCE_DELAY);
  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Input
          className={cn("h-9 font-medium text-normal", {
            "bg-red-50 border-red-200": undo,
          })}
          ref={ref}
          value={name}
          onChange={(e) => {
            const val = e.currentTarget.value;
            productsStore.trigger.updateProduct({
              id,
              recipe: (draft) => {
                draft.name = val;
              },
            });
            save(val);
          }}
          step={1 / Math.pow(10, fix)}
          placeholder="Nama produk..."
        />
        <Show when={undo}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100"
            onClick={() => undoName()}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </Show>
      </div>
    </div>
  );
});
