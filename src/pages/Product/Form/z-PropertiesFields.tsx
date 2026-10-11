import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { Section } from "./z-Section";

export function PropertiesFields({
  form,
  disabled,
}: {
  form: ProductFormController;
  disabled?: boolean;
}) {
  const { draft, errors } = form;

  return (
    <Section
      title="Properti"
      description="Metadata bebas, mis. asal, kedaluwarsa, atau supplier."
      action={
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1 text-small small:h-9"
          disabled={disabled}
          onClick={form.addProperty}
        >
          <Plus className="icon" /> Tambah
        </Button>
      }
    >
      {draft.properties.length === 0 ? (
        <p className="text-small text-muted-foreground">Belum ada properti.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {draft.properties.map((property) => (
            <div key={property.key} className="flex items-end gap-3">
              <Field
                label="Kunci"
                error={errors.propertyErrors?.[property.key]?.name}
                className="flex-1"
              >
                <Input
                  value={property.name}
                  disabled={disabled}
                  onChange={(e) => form.updateProperty(property.key, { name: e.currentTarget.value })}
                  placeholder="cth. asal"
                />
              </Field>
              <Field label="Nilai" className="flex-1">
                <Input
                  value={property.value}
                  disabled={disabled}
                  onChange={(e) =>
                    form.updateProperty(property.key, { value: e.currentTarget.value })
                  }
                  placeholder="cth. Gayo"
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="size-11 small:size-9"
                disabled={disabled}
                onClick={() => form.removeProperty(property.key)}
                aria-label="Hapus properti"
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
