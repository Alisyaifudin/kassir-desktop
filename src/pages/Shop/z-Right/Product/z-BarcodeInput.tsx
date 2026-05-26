import { memo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { tx } from "~/transaction";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Input } from "~/components/ui/input";
import { productsStore } from "../../store/product";
import { queue } from "../../util-queue";

export const BarcodeInput = memo(function BarcodeInput({
  id,
  fix,
  barcode,
  alreadyExist,
}: {
  id: string;
  fix: number;
  barcode: string;
  alreadyExist: boolean;
}) {
  const save = useDebouncedCallback((v: string) => {
    queue.add(tx.product.update.barcode(id, v));
  }, DEBOUNCE_DELAY);
  if (alreadyExist)
    return (
      <div className="h-10 flex items-center overflow-hidden">
        <Popover>
          <PopoverTrigger type="button" style={{ textOverflow: "ellipsis" }}>
            {barcode}
          </PopoverTrigger>
          <PopoverContent className="flex flex-col text-2xl w-fit">{barcode}</PopoverContent>
        </Popover>
      </div>
    );
  return (
    <Input
      className="px-1 border-b text-normal border-l border-r"
      value={barcode}
      onChange={(e) => {
        const val = e.currentTarget.value;
        productsStore.trigger.updateProduct({
          id,
          recipe: (draft) => {
            draft.barcode = val;
          },
        });
        save(val);
      }}
      step={1 / Math.pow(10, fix)}
    ></Input>
  );
});
