import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { memo, useState } from "react";
import { Undo2 } from "lucide-react";
import { basicStore } from "~/pages/Shop/use-transaction";
import { useStoreValue } from "@simplestack/store/react";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { updateProduct } from "./use-products";
import { useSelector } from "@xstate/store/react";
import { productsStore } from "./use-products-xstate";

export const PriceInput = memo(({ id }: { id: string }) => {
  const product = useSelector(productsStore, (s) => s.context.find((s) => s.id === id)?.product);
  const price = useSelector(productsStore, (s) => s.context.find((s) => s.id === id)!.price);
  const undo = product?.price !== undefined && product.price !== price;
  const fix = useStoreValue(basicStore.select("fix"));
  const [input, setInput] = useState(price.toString());
  const undoPrice = () => {
    const price = product?.price;
    if (price === undefined) return;
    setInput(price.toString());
    productsStore.trigger.updateProduct({
      id,
      recipe: (draft) => {
        draft.price = price;
      },
    });
    queue.add(() => tx.product.update.price(id, price));
  };
  const save = useDebouncedCallback((v: number) => {
    queue.add(() => tx.product.update.price(id, v));
  }, DEBOUNCE_DELAY);
  return (
    <div className="flex justify-between items-center">
      <input
        type="number"
        className={cn("px-0.5 text-normal min-w-0 border", {
          "bg-red-200": undo,
        })}
        value={input}
        onChange={(e) => {
          const val = e.currentTarget.value;
          const num = Number(val);
          if (isNaN(num) || num < 0) return;
          setInput(val);
          updateProduct(id, (draft) => {
            draft.price = num;
          });
          save(num);
        }}
        step={1 / Math.pow(10, fix)}
      ></input>
      <Show when={undo}>
        <button onClick={() => undoPrice()}>
          <Undo2 className="icon" />
        </button>
      </Show>
    </div>
  );
});
