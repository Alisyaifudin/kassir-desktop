import { X } from "lucide-react";
import { extrasStore } from "../../store/extra";
import { tx } from "~/transaction";
import { Button } from "~/components/ui/button";
import { queue } from "../../util-queue";

export function Delete({ id }: { id: string }) {
  return (
    <div className="py-0.5 flex items-center">
      <Button
        size="icon"
        variant="destructive"
        type="button"
        onClick={() => {
          extrasStore.trigger.delete({ id });
          queue.add(tx.extra.delById(id));
        }}
      >
        <X className="icon" />
      </Button>
    </div>
  );
}
