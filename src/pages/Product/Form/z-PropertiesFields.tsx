import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { ProductFormController } from "./useProductForm";
import { Field } from "./z-Field";
import { PendingInput } from "./z-Pending";
import { rowsClass, Section, SectionAdd, useFlatSection } from "./z-Section";

/** The section's static half, shared with the detail form's pending shape. */
export const PROPERTIES_SECTION = {
  title: "Properti",
  description: "Metadata bebas, mis. asal, kedaluwarsa, atau supplier.",
} as const;

/** A property row's words. The pending row reads them from here too. */
const PROPERTY_ROW = {
  key: { label: "Kunci", placeholder: "cth. asal" },
  value: { label: "Nilai", placeholder: "cth. Gayo" },
  remove: "Hapus properti",
} as const;

export function PropertiesFields({
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
      {...PROPERTIES_SECTION}
      action={<SectionAdd onClick={form.addProperty} disabled={disabled} />}
    >
      {draft.properties.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada properti.</p>
      ) : (
        <div className={rowsClass(flat)}>
          {draft.properties.map((property) => (
            <div key={property.key} className={cn("flex items-end gap-3", flat && "py-3")}>
              <Field
                label={PROPERTY_ROW.key.label}
                error={errors.propertyErrors?.[property.key]?.name}
                className="flex-1"
              >
                <Input
                  value={property.name}
                  disabled={disabled}
                  onChange={(e) =>
                    form.updateProperty(property.key, { name: e.currentTarget.value })
                  }
                  placeholder={PROPERTY_ROW.key.placeholder}
                />
              </Field>
              <Field label={PROPERTY_ROW.value.label} className="flex-1">
                <Input
                  value={property.value}
                  disabled={disabled}
                  onChange={(e) =>
                    form.updateProperty(property.key, { value: e.currentTarget.value })
                  }
                  placeholder={PROPERTY_ROW.value.placeholder}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="size-11"
                disabled={disabled}
                onClick={() => form.removeProperty(property.key)}
                aria-label={PROPERTY_ROW.remove}
              >
                <Trash2 className="size-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/**
 * The row before the property's values: the same two labels, the same placeholders
 * in the same boxes, empty and pulsing.
 */
export function PropertyRowSkeleton() {
  const flat = useFlatSection();
  return (
    <div className={cn("flex items-end gap-3", flat && "py-3")}>
      <Field label={PROPERTY_ROW.key.label} className="flex-1">
        <PendingInput placeholder={PROPERTY_ROW.key.placeholder} />
      </Field>
      <Field label={PROPERTY_ROW.value.label} className="flex-1">
        <PendingInput placeholder={PROPERTY_ROW.value.placeholder} />
      </Field>
      <Button
        type="button"
        variant="ghost"
        className="size-11"
        disabled
        aria-label={PROPERTY_ROW.remove}
      >
        <Trash2 className="size-5" />
      </Button>
    </div>
  );
}
