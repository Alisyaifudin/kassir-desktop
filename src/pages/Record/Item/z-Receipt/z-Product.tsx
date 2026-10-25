import { ForEach } from "~/components/ForEach";
import type { RecordListing } from "~/services/record";
import { Discount } from "./z-Discount";

export function Product({ product, fix }: { product: RecordListing; fix: number }) {
  return (
    <div className="flex flex-col">
      <p className="text-wrap">{product.name}</p>
      <div className="flex justify-between">
        <div className="flex gap-1 items-center">
          <p>{Number(product.price.toFixed(fix)).toLocaleString("id-ID")}</p>
          <p>×</p>
          <p>{product.qty}</p>
        </div>
        <p>{Number(product.total.toFixed(fix)).toLocaleString("id-ID")}</p>
      </div>
      <ForEach items={product.discounts}>
        {(discount) => <Discount discount={discount} fix={fix} />}
      </ForEach>
    </div>
  );
}
