import { cn } from "~/lib/utils";
import { memo, useState } from "react";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { updateProduct } from "./use-products";

export const QtyInput = memo(
  ({ id, qty, alreadyExist }: { id: string; qty: number; alreadyExist: boolean }) => {
    const [input, setInput] = useState(qty.toString());
    const save = useDebouncedCallback((v: number) => {
      queue.add(() => tx.product.update.qty(id, v));
    }, DEBOUNCE_DELAY);
    return (
      <input
        type="number"
        className={cn("px-0.5 text-normal", alreadyExist ? "border" : "border-b border-l border-r")}
        value={input}
        onChange={(e) => {
          const val = e.currentTarget.value;
          const num = Number(val);
          if (isNaN(num) || num < 0) return;
          setInput(val);
          updateProduct(id, (draft) => {
            draft.qty = num;
          });
          save(num);
        }}
        pattern="[1-9][0-9]*"
      ></input>
    );
  },
);
