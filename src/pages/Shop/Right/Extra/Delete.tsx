import { X } from "lucide-react";
import { queue } from "~/pages/Shop/utils/queue";
import { extrasStore } from "./use-extras";
import { tx } from "~/transaction";

export function Delete({ id }: { id: string }) {
  return (
    <div className="py-0.5 flex items-center">
      <button
        type="button"
        onClick={() => {
          extrasStore.set((prev) => prev.filter((p) => p.id !== id));
          queue.add(() => tx.extra.delById(id));
        }}
        className="bg-red-500 text-white"
      >
        <X className="icon" />
      </button>
    </div>
  );
}
