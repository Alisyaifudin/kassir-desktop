import { useState } from "react";
import { Input } from "~/components/ui/input";
import { productsStore } from "~/pages/shop/store/product";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction-effect";
import { Delete } from "./Delete";
import { DiscKind } from "./DiscKind";

export function DiscForm({
  id,
  discount,
}: {
  id: string;
  discount: { value: number; kind: "pcs" | "number" | "percent"; id: string };
}) {
  const [input, setInput] = useState(discount.value === 0 ? "" : discount.value.toString());
  return (
    <>
      <Input
        type="number"
        value={input}
        onChange={(e) => {
          let val = e.currentTarget.value;
          let num = Number(val);
          if (isNaN(num) || num < 0 || num > 1e9) return;
          if (discount.kind === "percent" && num > 100) {
            num = 100;
            val = "100";
          }
          setInput(val);
          productsStore.trigger.updateDiscount({
            id,
            idDisc: discount.id,
            updates: { value: num },
          });
          queue.add(tx.discount.update.value(discount.id, num));
        }}
        aria-autocomplete="list"
      ></Input>
      <DiscKind discount={discount} id={id} setInput={setInput} />
      <Delete id={id} idDisc={discount.id} />
    </>
  );
}
