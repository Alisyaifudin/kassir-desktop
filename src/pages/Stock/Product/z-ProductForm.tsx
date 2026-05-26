import { createFormHook, useStore } from "@tanstack/react-form";
import { FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { BarcodeInput } from "~/pages/Stock/Product/z-BarcodeInput";
import { Fragment } from "react/jsx-runtime";
import { fieldContext, formContext, useFieldContext } from "./util-product-options";
import { NoteInput } from "./z-NoteInput";
import { cn } from "~/lib/utils";

function ShortField({ children, type }: { children: string; type: "number" | "text" }) {
  const field = useFieldContext<string>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
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
    BarcodeInput,
    NoteInput,
  },
  formComponents: {},
});

export const ProductForm = withForm({
  defaultValues: {
    name: "",
    price: "",
    capital: "",
    stock: "",
    barcode: "",
    note: "",
  },
  props: {
    children: <Fragment></Fragment>,
  },
  render: function Render({ form, children }) {
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
        <form.AppField name="capital">
          {(field) => <field.ShortField type="number">Modal</field.ShortField>}
        </form.AppField>
        <form.AppField name="stock">
          {(field) => <field.ShortField type="number">Stok</field.ShortField>}
        </form.AppField>
        <form.AppField name="barcode">{(field) => <field.BarcodeInput />}</form.AppField>
        <form.AppField name="note">{(field) => <field.NoteInput />}</form.AppField>
        {children}
      </form>
    );
  },
});
