import { X } from "lucide-react";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction-effect";
import { memo } from "react";
import { productsStore } from "../../store/product";

import { Button } from "~/components/ui/button";

export const Delete = memo(function Delete({ id }: { id: string }) {
  return (
    <div className="flex items-center justify-center">
      <Button
        variant="destructive"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => {
          productsStore.trigger.deleteProduct({ id });
          queue.add(tx.product.delById(id));
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});
