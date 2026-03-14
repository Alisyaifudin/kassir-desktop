import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { productsStore } from "~/pages/shop/store/product";
import { queue } from "~/pages/shop/util-queue";
import { tx } from "~/transaction-effect";

export function DiscKind({
  id,
  discount,
  setInput,
}: {
  id: string;
  discount: { value: number; kind: "pcs" | "number" | "percent"; id: string };
  setInput: React.Dispatch<React.SetStateAction<string>>;
}) {
  function handleChange(kind: string) {
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
    queue.add(tx.discount.update.kind(discount.id, kind));
    if (value !== undefined) {
      queue.add(tx.discount.update.value(discount.id, value));
    }
  }
  return (
    <Select value={discount.kind} onValueChange={handleChange}>
      <SelectTrigger className="w-[110px]">
        <SelectValue placeholder="Jenis" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="number">Angka</SelectItem>
          <SelectItem value="percent">Persen</SelectItem>
          <SelectItem value="pcs">PCS</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
