import { createFormHook } from "@tanstack/react-form";
import { FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Fragment } from "react/jsx-runtime";
import { fieldContext, formContext, useFieldContext } from "./util-product-options";
import { NoteInput } from "./z-NoteInput";
import { cn } from "~/lib/utils";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";

function ShortField({ children, type }: { children: string; type: "number" | "text" }) {
  const field = useFieldContext<string>();
  const isSubmitting = field.form.state.isSubmitting;
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] items-center">
        <FieldLabel htmlFor={field.name}>{children}</FieldLabel>
        <Input
          type={type}
          className={cn("outline", type === "text" ? "w-full" : "w-40 small:w-32")}
          name={field.name}
          step="any"
          value={field.state.value}
          onBlur={field.handleBlur}
          disabled={isSubmitting}
          onChange={(e) => field.handleChange(e.currentTarget.value)}
          required
          aria-autocomplete="list"
        />
      </div>
      <FieldError errors={field.state.meta.errors} />
    </div>
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    ShortField,
    NoteInput,
  },
  formComponents: {},
});

export const ProductForm = withForm({
  defaultValues: {
    name: "",
    price: "",
    codes: [] as string[],
    capitals: [] as { capital: string; stock: string }[],
    note: "",
  },
  props: {
    children: <Fragment></Fragment>,
  },
  render: function Render({ form, children }) {
    const disabled = form.state.isSubmitting;

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col p-1 gap-2 text-normal overflow-y-auto"
      >
        <form.AppField name="name">
          {(field) => <field.ShortField type="text">Nama</field.ShortField>}
        </form.AppField>
        <form.AppField name="price">
          {(field) => <field.ShortField type="number">Harga</field.ShortField>}
        </form.AppField>

        {/* Codes — dynamic string array */}
        <div className="flex flex-col gap-1">
          <FieldLabel>Kode</FieldLabel>
          <form.Field name="codes" mode="array">
            {(field) => (
              <div className="flex flex-col gap-2">
                {field.state.value.map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <form.Field name={`codes[${i}]`}>
                      {(subField) => (
                        <Input
                          className="outline w-full"
                          value={subField.state.value}
                          disabled={disabled}
                          onBlur={subField.handleBlur}
                          onChange={(e) => subField.handleChange(e.currentTarget.value)}
                        />
                      )}
                    </form.Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => field.removeValue(i)}
                    >
                      <X className="icon" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => field.pushValue("")}
                >
                  <Plus className="icon" /> Tambah kode
                </Button>
              </div>
            )}
          </form.Field>
        </div>

        {/* Capitals — dynamic object array */}
        <div className="flex flex-col gap-1">
          <FieldLabel>Modal & Stok</FieldLabel>
          <form.Field name="capitals" mode="array">
            {(field) => (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[1fr_1fr_40px] small:grid-cols-[1fr_1fr_40px] items-center gap-2">
                  <span className="text-muted-foreground text-small">Modal</span>
                  <span className="text-muted-foreground text-small">Stok</span>
                  <span />
                </div>
                {field.state.value.map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_40px] small:grid-cols-[1fr_1fr_40px] items-center gap-2">
                    <form.Field name={`capitals[${i}].capital`}>
                      {(subField) => (
                        <Input
                          type="number"
                          step="any"
                          className="outline"
                          placeholder="0"
                          value={subField.state.value}
                          disabled={disabled}
                          onBlur={subField.handleBlur}
                          onChange={(e) => subField.handleChange(e.currentTarget.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`capitals[${i}].stock`}>
                      {(subField) => (
                        <Input
                          type="number"
                          step="any"
                          className="outline"
                          placeholder="0"
                          value={subField.state.value}
                          disabled={disabled}
                          onBlur={subField.handleBlur}
                          onChange={(e) => subField.handleChange(e.currentTarget.value)}
                        />
                      )}
                    </form.Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      onClick={() => field.removeValue(i)}
                    >
                      <X className="icon" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => field.pushValue({ capital: "", stock: "" })}
                >
                  <Plus className="icon" /> Tambah modal
                </Button>
              </div>
            )}
          </form.Field>
        </div>

        <form.AppField name="note">{(field) => <field.NoteInput />}</form.AppField>
        {children}
      </form>
    );
  },
});
