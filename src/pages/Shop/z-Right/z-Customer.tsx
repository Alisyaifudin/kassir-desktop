import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { tx } from "~/transaction-effect";
import { useAtom } from "@xstate/store/react";
// import { customerStore } from "./CustomerDialog/use-customer";
import { useTab } from "../use-tab";
import { queue } from "../util-queue";
import { customerStore } from "../use-transaction";

const emptyCustomer = {
  name: "",
  phone: "",
};

export function Customer() {
  const customer = useAtom(customerStore);
  const [tab] = useTab();
  function resetCustomer() {
    customerStore.set(emptyCustomer);
    queue.add(tx.transaction.update.customer(tab, emptyCustomer));
  }
  return (
    <Show when={customer.name.trim() !== ""}>
      <div className="relative z-10 flex items-center gap-2">
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
