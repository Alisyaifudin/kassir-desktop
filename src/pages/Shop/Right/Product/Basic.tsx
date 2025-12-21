import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { Discount } from "./Discount";
import { useProduct } from "./use-products";
import { PriceInput } from "./PriceInput";
import { QtyInput } from "./QtyInput";
import { useSize } from "~/hooks/use-size";
import { memo } from "react";
import { useFix } from "../../use-transaction";
import { Delete } from "./Delete";
import { TextError } from "~/components/TextError";

export const Basic = memo(({ id }: { id: string }) => {
  const size = useSize();
  const { name, error, barcode, discounts, price, qty, total, product } = useProduct(id);
  const fix = useFix();
  const alreadyExist = product !== undefined;
  return (
    <div className="flex flex-col">
      <p>{name}</p>
      <div className={cn("grid gap-1 items-center", css.item[size].inside)}>
        <p>{barcode}</p>
        <PriceInput id={id} price={price} productPrice={product?.price} />
        <Discount id={id} discounts={discounts} />
        <QtyInput id={id} qty={qty} alreadyExist={alreadyExist} />
        <p>{Number(total.toFixed(fix)).toLocaleString("id-ID")}</p>
        <Delete id={id} />
      </div>
      <TextError>{error}</TextError>
    </div>
  );
});
