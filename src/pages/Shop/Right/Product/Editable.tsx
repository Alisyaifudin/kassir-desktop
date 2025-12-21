import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { Show } from "~/components/Show";
import { Undo2 } from "lucide-react";
import { Discount } from "./Discount";
import { productsStore, useProduct } from "./use-products";
import { basicStore, useFix } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { PriceInput } from "./PriceInput";
import { QtyInput } from "./QtyInput";
import { Delete } from "./Delete";
import { tx } from "~/transaction";
import { useSize } from "~/hooks/use-size";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { memo, useRef } from "react";
import deepEq from "fast-deep-equal";
import { useAtom } from "@xstate/store/react";
import { TextError } from "~/components/TextError";

export const Editable = memo(
  ({ id }: { id: string }) => {
    const size = useSize();
    const { name, barcode, discounts, price, qty, total, product, error } = useProduct(id);
    const fix = useFix();
    const alreadyExist = product !== undefined;
    return (
      <div className="flex flex-col">
        <NameInput id={id} name={name} productName={product?.name} />
        <div className={cn("grid gap-1", css.item[size].inside)}>
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
  },
  (p, n) => deepEq(p, n)
);

const NameInput = memo(
  ({ id, name, productName }: { id: string; name: string; productName?: string }) => {
    const fix = useAtom(basicStore, (state) => state.fix);
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
      queue.add(() => tx.product.update.name(id, name));
      ref.current?.focus();
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
  }
);

const BarcodeInput = memo(
  ({
    id,
    fix,
    barcode,
    alreadyExist,
  }: {
    id: string;
    fix: number;
    barcode: string;
    alreadyExist: boolean;
  }) => {
    const save = useDebouncedCallback((v: string) => {
      queue.add(() => tx.product.update.barcode(id, v));
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
  }
);
