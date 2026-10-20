import { useState } from "react";
import { useStream } from "~/components/Loader";
import { Combobox } from "~/components/ui/combobox";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "../run";

/**
 * Who the sale is for. Picking an existing customer is written to the draft
 * immediately; a name that matches nothing is held here and only becomes a
 * customer when the sale is submitted — see the note under the field.
 */
export function Customer({ draft }: { draft: Draft }) {
  const res = useStream(service.customer.get.changes);
  if (res.type !== "success") return null;
  return <Field draft={draft} customers={res.data} />;
}

function Field({
  draft,
  customers,
}: {
  draft: Draft;
  customers: { id: string; name: string; phone: string }[];
}) {
  // A typed-but-unknown name lives here until submit creates it. Holding it in
  // state (rather than the draft) keeps a half-typed name from being persisted
  // as a customer id.
  const [pending, setPending] = useState<string | null>(null);
  const value = pending ?? draft.customerId ?? "";
  const options = customers.map((customer) => ({ value: customer.id, label: customer.name }));

  function handleChange(next: string) {
    // Clearing the field clears the customer; otherwise a picked name would
    // stick around with no way back to "no customer".
    if (next.trim() === "") {
      setPending("");
      run(service.transaction.set.customer(draft.id, null));
      return;
    }
    const known = customers.find((customer) => customer.id === next);
    if (known !== undefined) {
      setPending(null);
      run(service.transaction.set.customer(draft.id, known.id));
      return;
    }
    setPending(next);
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-small text-muted-foreground select-none">Pelanggan</span>
      <Combobox
        value={value}
        onValueChange={handleChange}
        options={options}
        placeholder="Cari atau pelanggan baru"
        emptyText="Pelanggan baru"
      />
      {pending !== null && pending.trim() !== "" ? (
        <span className="text-small text-muted-foreground">
          Pelanggan baru &ldquo;{pending}&rdquo; akan dibuat saat Bayar.
        </span>
      ) : null}
    </label>
  );
}