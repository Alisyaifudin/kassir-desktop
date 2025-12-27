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
import { memo, useState } from "react";
import { basicStore } from "../../use-transaction";
import { Discount as Disc, productsStore } from "./use-products";
import { queue, retry } from "../../utils/queue";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { tx } from "~/transaction";
import { generateId } from "~/lib/random";
import { useAtom } from "@xstate/store/react";

export const Discount = memo(({ id, discounts }: { id: string; discounts: Disc[] }) => {
  const fix = useAtom(basicStore, (state) => state.fix);
  const discEff =
    discounts.length === 0 ? 0 : Decimal.sum(...discounts.map((d) => d.eff)).toNumber();
  return (
    <Dialog>
      <div className="flex items-center justify-between px-1 gap-1">
        <p>{discEff === 0 ? "" : Number(discEff.toFixed(fix)).toLocaleString("id-ID")}</p>
        <DialogTrigger type="button">
          <Plus className="outline icon" />
        </DialogTrigger>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Diskon</DialogTitle>
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
});

function Add({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      onClick={async () => {
        setLoading(true);
        const id = generateId();
        productsStore.trigger.addDiscount({ id: productId, idDisc: id });
        const errMsg = await retry(10, () => tx.discount.add({ id, productId }));
        setLoading(false);
        if (errMsg !== null) {
          toast.error("Gagal membuat diskon baru");
          productsStore.trigger.deleteDiscount({ id: productId, idDisc: id });
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
          let val = e.currentTarget.value;
          let num = Number(val);
          if (isNaN(num) || num < 0) return;
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
          queue.add(() => tx.discount.update.value(discount.id, num));
        }}
        aria-autocomplete="list"
      ></Input>
      <select
        value={discount.kind}
        onChange={(e) => {
          const kind = e.currentTarget.value;
          if (kind !== "percent" && kind !== "number" && kind !== "pcs") return;
          let value: number | undefined = undefined;
          if (kind === "percent" && discount.value > 100) {
            value = 100;
            setInput("100");
          } else if (kind === "pcs") {
            value = 1;
            setInput("1");
          }
          productsStore.trigger.updateDiscount({
            id,
            idDisc: discount.id,
            updates: { kind, value },
          });
          queue.add(() => tx.discount.update.kind(discount.id, kind));
          if (value !== undefined) {
            queue.add(() => tx.discount.update.value(discount.id, value));
          }
        }}
        className=" w-[110px] border"
      >
        <option value="number">Angka</option>
        <option value="percent">Persen</option>
        <option value="pcs">PCS</option>
      </select>
      <Delete id={id} idDisc={discount.id} />
    </>
  );
}

function Delete({ idDisc, id }: { id: string; idDisc: string }) {
  return (
    <button
      onClick={() => {
        productsStore.trigger.deleteDiscount({ id, idDisc });
        queue.add(() => tx.discount.delById(idDisc));
      }}
      type="button"
      className="bg-red-500 w-fit h-fit text-white"
    >
      <X className="icon" />
    </button>
  );
}
