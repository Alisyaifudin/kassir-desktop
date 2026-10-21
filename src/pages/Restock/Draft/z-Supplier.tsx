import { useStream } from "~/components/Loader";
import { Combobox } from "~/components/ui/combobox";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";

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
  // The draft carries the pending new-supplier text, so closing this panel or
  // refreshing does not lose it before submit creates the supplier.
  const value = draft.supplierId ?? draft.supplierName;
  const options = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

  function handleChange(next: string) {
    const known = suppliers.find((supplier) => supplier.id === next);
    if (known !== undefined) {
      run(service.transaction.set.supplier(draft.id, known.id));
      run(service.transaction.set.supplierName(draft.id, ""));
      return;
    }
    run(service.transaction.set.supplier(draft.id, null));
    run(service.transaction.set.supplierName(draft.id, next));
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
      {draft.supplierId === null && draft.supplierName.trim() !== "" ? (
        <p className="text-small text-muted-foreground">
          Pemasok baru &ldquo;{draft.supplierName}&rdquo; akan dibuat saat Bayar.
        </p>
      ) : null}
    </div>
  );
}
