import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { PendingInput } from "./z-Pending";
import { rowsClass, Section, SectionAdd, useFlatSection } from "./z-Section";

/** The section's static half, shared with the detail form's pending shape. */
export const NAMES_SECTION = {
  title: "Nama Alternatif",
  description: "Nama lain untuk mencari produk ini, mis. singkatan atau sebutan pasar.",
} as const;

/** A name row's label and its empty box's placeholder. */
const NAMES_ROW = {
  label: "Nama",
  placeholder: "cth. Kopi Gayo",
  remove: "Hapus nama alternatif",
} as const;

export function ProductNamesFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  const { draft, errors } = form;
  const flat = useFlatSection();

  return (
    <Section
      {...NAMES_SECTION}
      action={<SectionAdd onClick={form.addProductName} disabled={disabled} />}
    >
      {draft.productNames.length === 0 ? (
        <p className="text-small text-muted-foreground">Belum ada nama alternatif.</p>
      ) : (
        <div className={rowsClass(flat)}>
          {draft.productNames.map((productName) => (
            <div key={productName.key} className={cn("flex items-end gap-3", flat && "py-3")}>
              <Field
                label={NAMES_ROW.label}
                error={errors.productNameErrors?.[productName.key]?.value}
                className="flex-1"
              >
                <Input
                  value={productName.value}
                  disabled={disabled}
                  onChange={(e) =>
                    form.updateProductName(productName.key, { value: e.currentTarget.value })
                  }
                  placeholder={NAMES_ROW.placeholder}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="size-11 small:size-9"
                disabled={disabled}
                onClick={() => form.removeProductName(productName.key)}
                aria-label={NAMES_ROW.remove}
              >
                <Trash2 className="icon" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/**
 * The row before the name's value: the same label, the same placeholder inside the
 * same input, empty and pulsing.
 */
export function NameRowSkeleton() {
  const flat = useFlatSection();
  return (
    <div className={cn("flex items-end gap-3", flat && "py-3")}>
      <Field label={NAMES_ROW.label} className="flex-1">
        <PendingInput placeholder={NAMES_ROW.placeholder} />
      </Field>
      <Button
        type="button"
        variant="ghost"
        className="size-11 small:size-9"
        disabled
        aria-label={NAMES_ROW.remove}
      >
        <Trash2 className="icon" />
      </Button>
    </div>
  );
}
