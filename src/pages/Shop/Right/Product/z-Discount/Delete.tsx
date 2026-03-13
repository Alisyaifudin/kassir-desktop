import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { productsStore } from "~/pages/shop/store/product";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction-effect";

export function Delete({ idDisc, id }: { id: string; idDisc: string }) {
  return (
    <Button
      variant="destructive"
      size="icon"
      onClick={() => {
        productsStore.trigger.deleteDiscount({ id, idDisc });
        queue.add(tx.discount.delById(idDisc));
      }}
      type="button"
    >
      <X className="icon" />
    </Button>
  );
}
