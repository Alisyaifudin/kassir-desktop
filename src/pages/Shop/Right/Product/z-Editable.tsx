import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { Undo2 } from "lucide-react";
import { Discount } from "./z-Discount";
import { queue } from "~/pages/Shop/utils/queue";
import { PriceInput } from "./z-PriceInput";
import { QtyInput } from "./z-QtyInput";
import { Delete } from "./z-Delete";
import { tx } from "~/transaction-effect";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { memo, useRef } from "react";
import { TextError } from "~/components/TextError";
import { useFix } from "../../use-transaction";
import { productsStore, useProduct } from "../../store/product";

export const Editable = memo(function Editable({ id }: { id: string }) {
  const { name, barcode, discounts, price, qty, total, product, error } = useProduct(id);
  const fix = useFix();
  const alreadyExist = product !== undefined;
  return (
    <div className="flex flex-col">
      <NameInput id={id} name={name} productName={product?.name} />
      <div className="grid gap-1 grid-cols-[1fr_160px_230px_70px_150px_50px] small:grid-cols-[1fr_110px_140px_40px_100px_30px]">
        <BarcodeInput id={id} fix={fix} alreadyExist={alreadyExist} barcode={barcode} />
        <PriceInput id={id} price={price} productPrice={product?.price} />
        <Discount id={id} discounts={discounts} />
        <QtyInput id={id} alreadyExist={alreadyExist} qty={qty} />
        <p>{Number(total.toFixed(fix)).toLocaleString("id-ID")}</p>
        <Delete id={id} />
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
    <div className="flex justify-between items-center">
      <Show when={undo}>
        <button onClick={() => undoName()}>
          <Undo2 className="icon" />
        </button>
      </Show>
      <input
        className={cn("px-0.5 border-b border-l text-normal border-r w-full", {
          "bg-red-100": undo,
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
      ></input>
    </div>
  );
});

const BarcodeInput = memo(function BarcodeInput({
  id,
  fix,
  barcode,
  alreadyExist,
}: {
  id: string;
  fix: number;
  barcode: string;
  alreadyExist: boolean;
}) {
  const save = useDebouncedCallback((v: string) => {
    queue.add(tx.product.update.barcode(id, v));
  }, DEBOUNCE_DELAY);
  if (alreadyExist) return <p>{barcode}</p>;
  return (
    <input
      className={cn("px-0.5 border-b text-normal border-l border-r")}
      value={barcode}
      onChange={(e) => {
        const val = e.currentTarget.value;
        productsStore.trigger.updateProduct({
          id,
          recipe: (draft) => {
            draft.barcode = val;
          },
        });
        save(val);
      }}
      step={1 / Math.pow(10, fix)}
    ></input>
  );
});
