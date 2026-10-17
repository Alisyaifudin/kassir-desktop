import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field } from "../z-Field";

/**
 * Adds a line by hand, for goods the catalog has never seen — the sack of rice
 * bought off a stall, the odd part with no barcode.
 *
 * Filed under Draft/ because what it makes is a draft line; it is rendered in
 * the left column next to the payment form, where the operator's hands already
 * are. See page.tsx.
 */
export function ManualLine() {
  return (
    <div className="flex flex-col gap-1 border-b p-1">
      <h2 className="pl-1 text-normal font-bold select-none">Tambahkan Manual</h2>
      <form
        className="flex flex-col gap-2 p-1"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Field label="Kode">
          <Input className="h-9" placeholder="Barcode (opsional)" aria-autocomplete="list" />
        </Field>
        <Field label="Nama">
          <Input className="h-9" placeholder="Nama barang" aria-autocomplete="list" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Harga Beli">
            <Input className="h-9 text-right" placeholder="0" aria-autocomplete="list" />
          </Field>
          <Field label="Qty">
            <Input className="h-9 text-center" placeholder="0" aria-autocomplete="list" />
          </Field>
        </div>
        <Button className="mt-1">Tambahkan</Button>
      </form>
    </div>
  );
}
