import { ForEach } from "~/components/ForEach";
import { Discount } from "./Discount";
import { Data } from "../loader";

export function Product({ name, price, qty, discounts, total }: Data["products"][number]) {
  return (
    <div className="flex flex-col">
      <p className="text-wrap">{name}</p>
      <div className="flex justify-between">
        <div className="flex gap-1 items-center">
          <p>{price.toLocaleString("id-ID")}</p>
          <span>&#215;</span>
          <p>{qty}</p>
        </div>
        <p>{total.toLocaleString("id-ID")}</p>
      </div>
      <ForEach items={discounts}>
        {(disc) => (
          <div className="flex justify-between">
            <Discount kind={disc.kind} value={disc.value} />
            <p>({disc.eff.toLocaleString("id-ID")})</p>
          </div>
        )}
      </ForEach>
    </div>
  );
}
