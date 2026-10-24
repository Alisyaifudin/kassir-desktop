import { Combobox } from "~/components/ui/combobox";
import { Input } from "~/components/ui/input";
import { pageData } from "../data";
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";

/**
 * Who the sale is for. Picking an existing customer writes its id to the draft;
 * a name that matches nothing is kept as text (`customerName`) and only becomes
 * a customer when the sale is submitted — see `z-Complete` and the note under
 * the field. The phone is only meaningful for that new customer.
 */
export function Customer({ draft }: { draft: Draft }) {
  const res = pageData.use("customers");
  // A failed read must not delete the field. Returning `null` made the failure
  // indistinguishable from "still loading": the combobox vanished and the sale
  // was committed with no customer and no message anywhere. The list falls back
  // to empty (a new name can still be typed), and the failure is said out loud.
  const customers = res.type === "success" ? res.data : [];
  return (
    <div className="flex flex-col gap-2">
      <Field draft={draft} customers={customers} />
      {res.type === "error" ? (
        <p role="alert" className="text-small text-destructive">
          Daftar pelanggan gagal dimuat ({res.error.message}). Penjualan tetap bisa disimpan,
          tetapi pelanggan harus diketik sebagai pelanggan baru.
        </p>
      ) : null}
    </div>
  );
}

function Field({
  draft,
  customers,
}: {
  draft: Draft;
  customers: { id: string; name: string; phone: string }[];
}) {
  const value = draft.customerId ?? draft.customerName;
  const options = customers.map((customer) => ({ value: customer.id, label: customer.name }));
  const isNew = draft.customerId === null && draft.customerName.trim() !== "";
  const selected =
    draft.customerId === null
      ? undefined
      : customers.find((customer) => customer.id === draft.customerId);

  function handleChange(next: string) {
    // Clearing the field clears the customer; otherwise a picked name would
    // stick around with no way back to "no customer".
    if (next.trim() === "") {
      run(service.transaction.set.customer(draft.id, null));
      run(service.transaction.set.customerName(draft.id, ""));
      run(service.transaction.set.customerPhone(draft.id, ""));
      return;
    }
    const known = customers.find((customer) => customer.id === next);
    if (known !== undefined) {
      run(service.transaction.set.customer(draft.id, known.id));
      run(service.transaction.set.customerName(draft.id, ""));
      run(service.transaction.set.customerPhone(draft.id, ""));
      return;
    }
    // A new name: drop any previously picked customer id and keep the text.
    run(service.transaction.set.customer(draft.id, null));
    run(service.transaction.set.customerName(draft.id, next));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-small text-muted-foreground select-none">Pelanggan</span>
        <Combobox
          value={value}
          onValueChange={handleChange}
          options={options}
          placeholder="Cari atau pelanggan baru"
          emptyText="Pelanggan baru"
        />
      </label>
      {isNew ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-small text-muted-foreground select-none">Telepon</span>
            <Input
              type="tel"
              inputMode="tel"
              value={draft.customerPhone}
              placeholder="Nomor telepon (opsional)"
              onChange={(event) =>
                run(service.transaction.set.customerPhone(draft.id, event.currentTarget.value))
              }
            />
          </label>
          <span className="text-small text-muted-foreground">
            Pelanggan baru &ldquo;{draft.customerName}&rdquo; akan dibuat saat Bayar.
          </span>
        </>
      ) : selected === undefined ? null : (
        <span className="text-small text-muted-foreground select-none">
          Telepon: {selected.phone.trim() === "" ? "—" : selected.phone}
        </span>
      )}
    </div>
  );
}
