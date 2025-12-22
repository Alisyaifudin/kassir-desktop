import { customerStore } from "../use-transaction";
import { queue } from "../utils/queue";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { tx } from "~/transaction";
import { useTab } from "../use-tab";
import { useAtom } from "@xstate/store/react";

const emptyCustomer = {
  name: "",
  phone: "",
};

export function Customer() {
  const customer = useAtom(customerStore);
  const [tab] = useTab();
  function resetCustomer() {
    if (tab === undefined) return;
    customerStore.set(emptyCustomer);
    queue.add(() => tx.transaction.update.customer(tab, emptyCustomer));
  }
  return (
    <Show when={customer.name.trim() !== "" && customer.phone.trim() !== ""}>
      <div className="flex items-center gap-2">
        <p className="text-normal">Pelanggan: {customer.name}</p>
        <Button
          variant="destructive"
          className="rounded-full p-1"
          onClick={resetCustomer}
          type="button"
        >
          <X className="icon" />
        </Button>
      </div>
    </Show>
  );
}
