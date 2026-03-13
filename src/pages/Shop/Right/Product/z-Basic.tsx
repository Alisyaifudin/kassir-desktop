import { cn } from "~/lib/utils";
import { Discount } from "./z-Discount";
import { PriceInput } from "./z-PriceInput";
import { QtyInput } from "./z-QtyInput";
import { memo } from "react";
import { Delete } from "./z-Delete";
import { TextError } from "~/components/TextError";
import { useFix } from "../../use-transaction";
import { useProduct } from "../../store/product";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

export const Basic = memo(function Basic({ id }: { id: string }) {
  const { name, error, barcode, discounts, price, qty, total, product } = useProduct(id);
  const fix = useFix();
  const alreadyExist = product !== undefined;
  return (
    <div className="flex flex-col">
      <div className="h-10 flex items-center">
        <span>{name}</span>
      </div>
      <div
        className={cn(
          "grid border-red-500 gap-1 items-center grid-cols-[1fr_160px_230px_70px_150px_50px] small:grid-cols-[1fr_110px_140px_40px_100px_30px]",
        )}
      >
        <div className="h-10 flex items-center overflow-hidden">
          <Popover>
            <PopoverTrigger type="button" style={{ textOverflow: "ellipsis" }}>
              {barcode}
            </PopoverTrigger>
            <PopoverContent className="flex flex-col text-2xl w-fit">{barcode}</PopoverContent>
          </Popover>
        </div>
        <PriceInput id={id} price={price} productPrice={product?.price} />
        <Discount id={id} discounts={discounts} />
        <QtyInput id={id} qty={qty} alreadyExist={alreadyExist} />
        <span>{Number(total.toFixed(fix)).toLocaleString("id-ID")}</span>
        <Delete id={id} />
      </div>
      <TextError>{error}</TextError>
    </div>
  );
});
