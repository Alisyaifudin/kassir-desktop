import { useState } from "react";
import { Customer } from "~/database/customer/get-all";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { useNew } from "./use-new";
import { Button } from "~/components/ui/button";
import { useAtom } from "@xstate/store/react";
import { customerStore } from "../../use-transaction";

export function NewCustomer({
  customers,
  onClose,
}: {
  customers: Customer[];
  onClose: () => void;
}) {
  const customer = useAtom(customerStore);
  const [form, setForm] = useState(() => {
    if (customer.id === undefined) {
      return {
        phone: customer.phone,
        name: customer.name,
      };
    }
    return { phone: "", name: "" };
  });
  const { error, handleSubmit, ref, setError } = useNew(customers, form, onClose);
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[100px_1fr] py-0.5 items-center gap-2">
      <Label htmlFor="customer-name">Nama</Label>
      <Input
        aria-autocomplete="list"
        ref={ref}
        value={form.name}
        onChange={(e) => {
          const val = e.currentTarget.value;
          setForm((form) => ({ ...form, name: val }));
          setError("");
        }}
        id="customer-name"
      />
      <Label htmlFor="customer-hp">HP</Label>
      <Input
        aria-autocomplete="list"
        value={form.phone}
        onChange={(e) => {
          const val = e.currentTarget.value;
          setForm((form) => ({ ...form, phone: val }));
          setError("");
        }}
        id="customer-hp"
      />
      <div className="col-span-2 flex justify-end">
        <Button>Tambahkan</Button>
      </div>
      <TextError>{error}</TextError>
    </form>
  );
}
