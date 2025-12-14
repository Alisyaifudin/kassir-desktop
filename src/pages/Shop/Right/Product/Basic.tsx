import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { Discount } from "./Discount";
import { Product } from "./use-products-xstate";
import { PriceInput } from "./PriceInput";
import { QtyInput } from "./QtyInput";
import { Total } from "./Total";
import { Delete } from "./Delete";
import { useSize } from "~/hooks/use-size";
import { memo } from "react";
import deepEq from "fast-deep-equal";

export const Basic = memo(
  ({
    product: { barcode, name, price, id, qty, discounts, product },
  }: {
    product: Product;
  }) => {
    const size = useSize();
    return (
      <div className="flex flex-col">
        <p>{name}</p>
        <div className={cn("grid gap-1 items-center", css.item[size].inside)}>
          <p>{barcode}</p>
          {/* <PriceInput id={id} price={price} productPrice={product?.price} /> */}
          <PriceInput id={id} />
          <Discount id={id} qty={qty} price={price} discounts={discounts} />
          <QtyInput id={id} qty={qty} alreadyExist={product !== undefined} />
          <Total id={id} discEff={discEff} price={price} qty={qty} subtotal={subtotal} />
          <Delete id={id} />
        </div>
      </div>
    );
  },
  (p, n) => deepEq(p, n),
);
