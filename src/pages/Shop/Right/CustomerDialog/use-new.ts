import { useEffect, useRef, useState } from "react";
import { customerStore } from "./use-customer";
import { Customer } from "~/database-effect/customer/get-all";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction-effect";
import { useTab } from "../../use-tab";

export function useNew(customers: Customer[], form: { phone: string; name: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [tab] = useTab();
  useEffect(() => {
    if (ref.current === null) return;
    ref.current.focus();
  }, []);
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tab === undefined) return;
    if (error !== "") return;
    if (customers.find((c) => c.phone === form.phone) !== undefined) {
      setError("Pelanggan sudah ada");
      return;
    }
    setError("");
    const customer = { name: form.name, phone: form.phone };
    customerStore.set(customer);
    queue.add(tx.transaction.update.customer(tab, customer));
  }
  return { error, setError, ref, handleSubmit };
}
