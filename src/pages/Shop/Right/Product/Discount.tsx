import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import Decimal from "decimal.js";
import { ForEach } from "~/components/ForEach";
import { memo, useEffect, useState } from "react";
import { basicStore } from "../../use-transaction";
import { useStoreValue } from "@simplestack/store/react";
import { Discount as Disc, updateDiscount, updateProduct } from "./use-products";
import { queue, retry } from "../../utils/queue";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { tx } from "~/transaction";
import { generateId } from "~/lib/random";
import deepEq from "fast-deep-equal";

export const Discount = memo(
  ({
    id,
    discounts,
    price,
    qty,
  }: {
    price: number;
    qty: number;
    id: string;
    discounts: Disc[];
  }) => {
    const discEff = calcEffDisc({ price, qty }, discounts);
    useEffect(() => {
      updateProduct(id, (draft) => {
        draft.discEff = discEff.toNumber();
      });
    }, [discounts, price, qty]);
    const fix = useStoreValue(basicStore.select("fix"));
    return (
      <Dialog>
        <div className="flex items-center justify-between px-1 gap-1">
          <p>
            {discEff.toNumber() === 0 ? "" : Number(discEff.toFixed(fix)).toLocaleString("id-ID")}
          </p>
          <DialogTrigger type="button">
            <Plus className="outline icon" />
          </DialogTrigger>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-normal">Diskon</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-[1fr_110px_50px] gap-1 text-3xl items-center">
            <ForEach items={discounts}>{(disc) => <DiscForm id={id} discount={disc} />}</ForEach>
            <Add productId={id} />
          </div>
          <DialogFooter className="flex justify-between w-full ">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Tutup
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
  (prev, next) => deepEq(prev, next),
);

function Add({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      onClick={async () => {
        setLoading(true);
        const id = generateId();
        updateProduct(productId, (draft) => {
          draft.discounts.push({
            id,
            kind: "percent",
            value: 0,
          });
        });
        const errMsg = await retry(10, () => tx.discount.add({ id, productId }));
        setLoading(false);
        if (errMsg !== null) {
          toast.error("Gagal membuat diskon baru");
          updateProduct(productId, (draft) => {
            draft.discounts = draft.discounts.filter((d) => d.id !== id);
          });
          return;
        }
      }}
      type="button"
    >
      <Spinner when={loading} />
      Tambah Diskon
      <Plus />
    </Button>
  );
}

function DiscForm({
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
          const val = e.currentTarget.value;
          const num = Number(val);
          if (isNaN(num) || num < 0) return;
          setInput(val);
          updateDiscount(id, (draft) => {
            draft.value = num;
          });
          queue.add(() => tx.discount.update.value(discount.id, num));
        }}
        aria-autocomplete="list"
      ></Input>
      <select
        value={discount.kind}
        onChange={(e) => {
          const val = e.currentTarget.value;
          if (val !== "percent" && val !== "number" && val !== "pcs") return;
          updateDiscount(id, (draft) => {
            draft.kind = val;
          });
          queue.add(() => tx.discount.update.kind(discount.id, val));
        }}
        className=" w-[110px] border"
      >
        <option value="number">Angka</option>
        <option value="percent">Persen</option>
        <option value="pcs">PCS</option>
      </select>
      <Delete id={id} discId={discount.id} />
    </>
  );
}

function Delete({ discId, id }: { id: string; discId: string }) {
  return (
    <button
      onClick={() => {
        updateProduct(id, (draft) => {
          draft.discounts = draft.discounts.filter((d) => d.id !== discId);
        });
        queue.add(() => tx.discount.delById(discId));
      }}
      type="button"
      className="bg-red-500 w-fit h-fit text-white"
    >
      <X className="icon" />
    </button>
  );
}

function calcEffDisc(
  item: { price: number; qty: number },
  discounts: { value: number; kind: "number" | "percent" | "pcs" }[],
): Decimal {
  const subtotal = new Decimal(item.price).times(item.qty);
  let total = new Decimal(subtotal);
  for (const discount of discounts) {
    switch (discount.kind) {
      case "number": {
        const eff = new Decimal(discount.value);
        total = total.minus(eff);
        break;
      }
      case "pcs": {
        const eff = new Decimal(discount.value).times(item.price);
        total = total.minus(eff);
        break;
      }
      case "percent": {
        const eff = new Decimal(discount.value).div(100).times(total);
        total = total.minus(eff);
        break;
      }
    }
  }
  const discEff = subtotal.minus(total);
  return discEff;
}
