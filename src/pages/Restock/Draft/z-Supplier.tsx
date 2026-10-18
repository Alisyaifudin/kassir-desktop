import { useState } from "react";
import { useStream } from "~/components/Loader";
import { Combobox } from "~/components/ui/combobox";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "../run";

/**
 * Who the goods were bought from. Picking an existing supplier is written to the
 * draft immediately; a name that matches nothing is held here and only becomes a
 * supplier when the purchase is submitted — see the note under the field.
 */
export function Supplier({ draft }: { draft: Draft }) {
  const res = useStream(service.supplier.get.changes);
  if (res.type !== "success") return null;
  return <Field draft={draft} suppliers={res.data} />;
}

function Field({
  draft,
  suppliers,
}: {
  draft: Draft;
  suppliers: { id: string; name: string }[];
}) {
  // A typed-but-unknown name lives here until submit creates it. Holding it in
  // state (rather than the draft) is what keeps a half-typed supplier from
  // being persisted as a supplier id.
  const [pending, setPending] = useState<string | null>(null);
  const value = pending ?? draft.supplierId ?? "";
  const options = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

  function handleChange(next: string) {
    const known = suppliers.find((supplier) => supplier.id === next);
    if (known !== undefined) {
      setPending(null);
      run(service.transaction.set.supplier(draft.id, known.id));
      return;
    }
    setPending(next.trim() === "" ? null : next);
  }

  return (
    <div className="flex min-w-[220px] flex-col gap-1">
      <Combobox
        value={value}
        onValueChange={handleChange}
        options={options}
        placeholder="Cari atau pemasok baru"
        emptyText="Pemasok baru"
      />
      {pending !== null ? (
        <p className="text-small text-muted-foreground">
          Pemasok baru &ldquo;{pending}&rdquo; akan dibuat saat Bayar.
        </p>
      ) : null}
    </div>
  );
}
