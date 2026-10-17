import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field } from "../z-Field";

/**
 * A supplier the shop has not bought from before. No phone number: a market
 * stall or a WhatsApp handle does not fit a phone column, and what the operator
 * actually needs is somewhere to write down who this is.
 */
export function New() {
  return (
    <form
      className="flex h-full w-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Field label="Nama">
        <Input placeholder="Nama pemasok" aria-autocomplete="list" />
      </Field>
      <Field label="Catatan" className="min-h-0 flex-1">
        <Textarea className="h-full" placeholder="Blok, nama pemilik, jadwal kirim..." rows={4} />
      </Field>
      <div className="flex items-end justify-end">
        <Button type="submit">Tambahkan</Button>
      </div>
    </form>
  );
}
