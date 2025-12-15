import { X } from "lucide-react";
import { queue } from "../../utils/queue";
import { productsStore } from "./use-products";
import { tx } from "~/transaction";
import { memo } from "react";

export const Delete = memo(({ id }: { id: string }) => {
  return (
    <div className="py-0.5 flex items-center">
      <button
        type="button"
        onClick={() => {
          productsStore.trigger.deleteProduct({ id });
          queue.add(() => tx.product.delById(id));
        }}
        className="bg-red-500 text-white"
      >
        <X className="icon" />
      </button>
    </div>
  );
});
