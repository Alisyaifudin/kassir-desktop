import { X } from "lucide-react";
import { queue } from "~/pages/Shop/utils/queue";
import { extrasStore } from "../../store/extra";
import { tx } from "~/transaction-effect";

export function Delete({ id }: { id: string }) {
  return (
    <div className="py-0.5 flex items-center">
      <button
        type="button"
        onClick={() => {
          extrasStore.trigger.delete({ id });
          queue.add(tx.extra.delById(id));
        }}
        className="bg-red-500 text-white"
      >
        <X className="icon" />
      </button>
    </div>
  );
}
