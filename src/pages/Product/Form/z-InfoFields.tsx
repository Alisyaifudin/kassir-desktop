import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";

/**
 * The two field labels and their placeholders, shared with the detail form's
 * pending shape, so the skeleton and the form can never disagree about which
 * field is which — or about what an empty one says.
 */
export const INFO_LABELS = {
  name: "Nama produk",
  note: "Catatan",
} as const;

export const INFO_PLACEHOLDERS = {
  name: "cth. Kopi Arabika 1kg",
  note: "Opsional",
} as const;

export function InfoFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field label={INFO_LABELS.name} htmlFor="product-name" error={form.errors.name}>
        <Input
          id="product-name"
          value={form.draft.name}
          disabled={disabled}
          onChange={(e) => form.setName(e.currentTarget.value)}
          placeholder={INFO_PLACEHOLDERS.name}
        />
      </Field>
      <Field label={INFO_LABELS.note} htmlFor="product-note">
        <Textarea
          id="product-note"
          value={form.draft.note}
          disabled={disabled}
          onChange={(e) => form.setNote(e.currentTarget.value)}
          placeholder={INFO_PLACEHOLDERS.note}
          rows={3}
        />
      </Field>
    </div>
  );
}
