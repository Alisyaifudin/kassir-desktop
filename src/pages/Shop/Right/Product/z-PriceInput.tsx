import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { memo, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction-effect";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { productsStore } from "../../store/product";
import { useFix } from "../../use-transaction";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

function setPrice(id: string, v: number) {
  return productsStore.trigger.updateProduct({
    id,
    recipe: (draft) => {
      draft.price = v;
    },
  });
}

export const PriceInput = memo(function PriceInput({
  id,
  price,
  productPrice,
}: {
  id: string;
  price: number;
  productPrice?: number;
}) {
  const undo = productPrice !== undefined && productPrice !== price;
  const fix = useFix();
  const ref = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(price.toString());
  const undoPrice = () => {
    const price = productPrice;
    if (price === undefined) return;
    setInput(price.toString());
    setPrice(id, price);
    queue.add(tx.product.update.price(id, price));
    ref.current?.focus();
  };
  const save = useDebouncedCallback((v: number) => {
    queue.add(tx.product.update.price(id, v));
  }, DEBOUNCE_DELAY);
  return (
    <div className="relative flex items-center">
      <Input
        ref={ref}
        type="number"
        className={cn("h-9 text-right pr-8", {
          "bg-red-50 border-red-200": undo,
        })}
        value={input}
        onChange={(e) => {
          const val = e.currentTarget.value;
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 1e9) return;
          setInput(val);
          setPrice(id, num);
          save(num);
        }}
        step={1 / Math.pow(10, fix)}
      />
      <Show when={undo}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100"
          onClick={() => undoPrice()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </Show>
    </div>
  );
});
