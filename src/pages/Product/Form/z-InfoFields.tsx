import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";

export function InfoFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nama produk" htmlFor="product-name" error={form.errors.name}>
        <Input
          id="product-name"
          value={form.draft.name}
          disabled={disabled}
          onChange={(e) => form.setName(e.currentTarget.value)}
          placeholder="cth. Kopi Arabika 1kg"
        />
      </Field>
      <Field label="Catatan" htmlFor="product-note">
        <Textarea
          id="product-note"
          value={form.draft.note}
          disabled={disabled}
          onChange={(e) => form.setNote(e.currentTarget.value)}
          placeholder="Opsional"
          rows={3}
        />
      </Field>
    </div>
  );
}
