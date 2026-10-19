import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { Section } from "./z-Section";

export function ProductNamesFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  const { draft, errors } = form;

  return (
    <Section
      title="Nama Alternatif"
      description="Nama lain untuk mencari produk ini, mis. singkatan atau sebutan pasar."
      action={
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1 text-small small:h-9"
          disabled={disabled}
          onClick={form.addProductName}
        >
          <Plus className="icon" /> Tambah
        </Button>
      }
    >
      {draft.productNames.length === 0 ? (
        <p className="text-small text-muted-foreground">Belum ada nama alternatif.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {draft.productNames.map((productName) => (
            <div key={productName.key} className="flex items-end gap-3">
              <Field
                label="Nama"
                error={errors.productNameErrors?.[productName.key]?.value}
                className="flex-1"
              >
                <Input
                  value={productName.value}
                  disabled={disabled}
                  onChange={(e) =>
                    form.updateProductName(productName.key, { value: e.currentTarget.value })
                  }
                  placeholder="cth. Kopi Gayo"
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="size-11 small:size-9"
                disabled={disabled}
                onClick={() => form.removeProductName(productName.key)}
                aria-label="Hapus nama alternatif"
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
