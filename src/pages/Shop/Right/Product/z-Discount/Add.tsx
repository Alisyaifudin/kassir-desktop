import { Plus } from "lucide-react";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { generateId } from "~/lib/random";
import { productsStore } from "~/pages/shop/store/product";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction-effect";

export function Add({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={async () => {
          setLoading(true);
          const id = generateId();
          productsStore.trigger.addDiscount({ id: productId, idDisc: id });
          queue.add(tx.discount.add({ id, productId }), {
            onSuccess: () => {
              setLoading(false);
            },
            onFailure: () => {
              setLoading(false);
            },
          });
        }}
        type="button"
      >
        Tambah Diskon
        <Plus />
      </Button>
      <Spinner when={loading} />
    </div>
  );
}
