import { X } from "lucide-react";
import { queue } from "../../utils/queue";
import { productsStore } from "./use-products";
import { tx } from "~/transaction";

export function Delete({ id }: { id: string }) {
  return (
    <div className="py-0.5 flex items-center">
      <button
        type="button"
        onClick={() => {
          productsStore.set((prev) => prev.filter((p) => p.id !== id));
          queue.add(() => tx.product.delById(id));
        }}
        className="bg-red-500 text-white"
      >
        <X className="icon" />
      </button>
    </div>
  );
}
