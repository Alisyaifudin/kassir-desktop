import { Discount } from "./z-Discount";
import { PriceInput } from "./z-PriceInput";
import { QtyInput } from "./z-QtyInput";
import { Delete } from "./z-Delete";
import { useFix } from "../../use-transaction";
import { Product } from "../../store/product";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { TextError } from "~/components/TextError";
import { BarcodeInput } from "./z-BarcodeInput";

export function Basic({ item }: { item: Product }) {
  const { name, error, barcode, discounts, price, qty, total, product, id } = item;
  const alreadyExist = product !== undefined;
  const fix = useFix();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0 ">
          <Popover>
            <PopoverTrigger asChild>
              <h3 className="text-normal text-foreground leading-tight w-fit truncate">{name}</h3>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col text-normal w-full max-w-3xl text-wrap">
              {name}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-none text-right">
          <div className="text-big font-bold text-primary tabular-nums">
            Rp{Number(total.toFixed(fix)).toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_180px_180px_110px] small:grid-cols-[1fr_120px_120px_90px] gap-1 items-end">
        <div className="col-span-1">
          <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
            Kode
          </div>
          <BarcodeInput id={id} fix={fix} alreadyExist={alreadyExist} barcode={barcode} />
        </div>

        <div className="col-span-1">
          <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
            Harga Satuan
          </div>
          <PriceInput id={id} price={price} productPrice={product?.price} />
        </div>

        <div className="col-span-1 h-[62px] flex flex-col">
          <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
            Diskon
          </div>
          <Discount id={id} discounts={discounts} />
        </div>

        <div className="col-span-1 flex items-end gap-2">
          <div className="flex-1">
            <div className="text-tiny font-bold text-muted-foreground/70 uppercase mb-1.5 ml-0.5 tracking-wide">
              Qty
            </div>
            <QtyInput id={id} qty={qty} />
          </div>
          <div className="pb-1 pr-1 flex items-center">
            <Delete id={id} />
          </div>
        </div>
      </div>

      <TextError>{error}</TextError>
    </div>
  );
}
