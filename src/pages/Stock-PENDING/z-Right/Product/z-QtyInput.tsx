import { cn } from "~/lib/utils";
import { memo, useEffect, useState } from "react";
import { tx } from "~/transaction";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { productsStore } from "../../store/product";

import { Input } from "~/components/ui/input";
import { queue } from "../../util-queue";

export const QtyInput = memo(function QtyInput({ id, qty }: { id: string; qty: number }) {
  const [input, setInput] = useState(qty === 0 ? "" : qty.toString());
  const save = useDebouncedCallback((v: number) => {
    queue.add(tx.product.update.qty(id, v));
  }, DEBOUNCE_DELAY);
  useEffect(() => {
    if (qty !== 0 && qty !== Number(input)) setInput(qty.toString());
  }, [qty, input]);
  return (
    <Input
      type="number"
      className={cn("h-9 text-center")}
      value={input}
      onChange={(e) => {
        const val = e.currentTarget.value;
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 1e4) return;
        setInput(val);
        productsStore.trigger.updateProduct({
          id,
          recipe: (draft) => {
            draft.qty = num;
          },
        });
        save(num);
      }}
      pattern="[1-9][0-9]*"
    />
  );
});
