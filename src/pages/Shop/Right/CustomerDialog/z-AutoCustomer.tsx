import { useEffect, useRef, useState } from "react";
import { Customer } from "~/database/customer/get-all";
import { useAtom } from "@xstate/store/react";
import { customerStore } from "./use-customer";
import { tx } from "~/transaction-effect";
import { queue } from "../../utils/queue";
import { Input } from "~/components/ui/input";
import { Show } from "~/components/Show";
import { X } from "lucide-react";
import { ForEach } from "~/components/ForEach";
import { Button } from "~/components/ui/button";
import { useTab } from "../../use-tab";

export function AutoCustomer({ customers: all }: { customers: Customer[] }) {
  const customer = useAtom(customerStore);
  const [tab] = useTab();
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.focus();
  }, []);
  let customers: Customer[] = [];
  if (query.trim() !== "") {
    const q = query.toLowerCase().trim();
    customers = all.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q),
    );
  }
  function handleSelect(name: string, phone: string, id: number) {
    return function () {
      const customer = { name, phone, id };
      setQuery("");
      customerStore.set(customer);
      queue.add(tx.transaction.update.customer(tab, customer));
    };
  }
  function handleUnselect() {
    if (tab === undefined) return;
    const customer = { name: "", phone: "" };
    customerStore.set(customer);
    queue.add(tx.transaction.update.customer(tab, customer));
  }
  return (
    <div className="flex flex-col gap-2 p-0.5 overflow-hidden">
      <Input
        ref={ref}
        placeholder="Nama atau hp"
        aria-autocomplete="list"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        type="search"
      />
      <Show
        when={
          customer.id !== undefined && customer.name.trim() !== "" && customer.phone.trim() !== ""
        }
      >
        <div className="flex gap-3 items-center justify-between">
          <div className="flex-1 flex items-center justify-between">
            <p className="text-3xl font-bold">{customer.name}</p>
            <p className="text-3xl font-bold">{customer.phone}</p>
          </div>
          <button type="button" onClick={handleUnselect}>
            <X size={35} />
          </button>
        </div>
      </Show>
      <ul className="flex flex-col gap-2 overflow-auto">
        <ForEach items={customers}>
          {(customer) => (
            <li className="flex w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSelect(customer.name, customer.phone, customer.id)}
                className="flex items-center justify-between w-full h-10"
              >
                <p className="text-3xl font-normal">{customer.name}</p>
                <p className="text-3xl font-normal">{customer.phone}</p>
              </Button>
            </li>
          )}
        </ForEach>
      </ul>
    </div>
  );
}
