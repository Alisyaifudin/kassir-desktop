import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { Show } from "~/components/Show";
import { Undo2 } from "lucide-react";
import { Discount } from "./Discount";
import { Product, updateProduct } from "./use-products";
import { useStoreValue } from "@simplestack/store/react";
import { basicStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { PriceInput } from "./PriceInput";
import { QtyInput } from "./QtyInput";
import { Total } from "./Total";
import { Delete } from "./Delete";
import { tx } from "~/transaction";
import { useSize } from "~/hooks/use-size";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { memo } from "react";
import deepEq from "fast-deep-equal";

export const Editable = memo(
  ({
    product: { barcode, price, discounts, id, name, qty, subtotal, product },
  }: {
    product: Product;
  }) => {
    const size = useSize();
    return (
      <div className="flex flex-col">
        <NameInput id={id} name={name} productName={product?.name} />
        <div className={cn("grid gap-1", css.item[size].inside)}>
          <BarcodeInput id={id} barcode={barcode} alreadyExist={product !== undefined} />
          <PriceInput id={id} price={price} productPrice={product?.price} />
          <Discount id={id} qty={qty} price={price} discounts={discounts} />
          <QtyInput id={id} qty={qty} alreadyExist={product !== undefined} />
          <Total id={id} subtotal={subtotal} price={price} qty={qty} />
          <Delete id={id} />
        </div>
      </div>
    );
  },
  (p, n) => deepEq(p, n),
);

function NameInput({ id, name, productName }: { id: string; name: string; productName?: string }) {
  const fix = useStoreValue(basicStore.select("fix"));
  const undo = productName !== undefined && productName !== name;
  const undoName = () => {
    const name = productName;
    if (name === undefined) return;
    updateProduct(id, (draft) => {
      draft.name = name;
    });
    queue.add(() => tx.product.update.name(id, name));
  };
  const save = useDebouncedCallback((v: string) => {
    queue.add(() => tx.product.update.name(id, v));
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
        value={name}
        onChange={(e) => {
          const val = e.currentTarget.value;
          updateProduct(id, (draft) => {
            draft.name = val;
          });
          save(val);
        }}
        step={1 / Math.pow(10, fix)}
      ></input>
    </div>
  );
}

function BarcodeInput({
  id,
  barcode,
  alreadyExist,
}: {
  id: string;
  barcode: string;
  alreadyExist: boolean;
}) {
  const fix = useStoreValue(basicStore.select("fix"));
  const save = useDebouncedCallback((v: string) => {
    queue.add(() => tx.product.update.barcode(id, v));
  }, DEBOUNCE_DELAY);
  if (alreadyExist) return <p>{barcode}</p>;
  return (
    <input
      className={cn("px-0.5 border-b border-l border-r")}
      value={barcode}
      onChange={(e) => {
        const val = e.currentTarget.value;
        updateProduct(id, (draft) => {
          draft.barcode = val;
        });
        save(val);
      }}
      step={1 / Math.pow(10, fix)}
    ></input>
  );
}
