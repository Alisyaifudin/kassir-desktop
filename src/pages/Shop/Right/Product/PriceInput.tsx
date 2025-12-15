import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { memo, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { basicStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useAtom } from "@xstate/store/react";
import { productsStore } from "./use-products";

function setPrice(id: string, v: number) {
  return productsStore.trigger.updateProduct({
    id,
    recipe: (draft) => {
      draft.price = v;
    },
  });
}

export const PriceInput = memo(
  ({ id, price, productPrice }: { id: string; price: number; productPrice?: number }) => {
    const undo = productPrice !== undefined && productPrice !== price;
    const fix = useAtom(basicStore, (state) => state.fix);
    const ref = useRef<HTMLInputElement>(null);
    const [input, setInput] = useState(price.toString());
    const undoPrice = () => {
      const price = productPrice;
      if (price === undefined) return;
      setInput(price.toString());
      setPrice(id, price);
      queue.add(() => tx.product.update.price(id, price));
      ref.current?.focus();
    };
    const save = useDebouncedCallback((v: number) => {
      queue.add(() => tx.product.update.price(id, v));
    }, DEBOUNCE_DELAY);
    return (
      <div className="flex justify-between items-center">
        <input
          ref={ref}
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
            setPrice(id, num);
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
  },
);
