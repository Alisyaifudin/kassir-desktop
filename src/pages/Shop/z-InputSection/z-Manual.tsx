import { Button } from "~/components/ui/button";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Field, FieldError } from "~/components/ui/field";
import { Product } from "~/services/product";
import { generateId } from "~/lib/random";

const schema = z.object({
  codes: z.array(z.string()),
  name: z.string().nonempty("Harus ada"),
  price: z.number({ message: "Harus angka" }).min(0, "Minimal 0"),
  qty: z.number({ message: "Harus angka" }).min(1, "Minimal 1"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  useManual: () => {
    codes: string[];
    name: string;
    qty: number;
    price: number;
  };
  set: {
    code: {
      edit: (i: number, code: string) => void;
      add: () => void;
      remove: (i: number) => void;
    };
    name: (name: string) => void;
    qty: (qty: number) => void;
    price: (price: number) => void;
  };
  onSubmit: (values: Product) => string[];
};

export function Manual({ useManual, set, onSubmit }: Props) {
  const initial = useManual();
  const [error, setError] = useState<string[]>(initial.codes.map(() => ""));

  const form = useForm({
    defaultValues: {
      codes: initial.codes.length > 0 ? initial.codes : [""],
      name: initial.name,
      price: initial.price,
      qty: initial.qty,
    } satisfies FormValues,
    validators: { onSubmit: schema },
    onSubmit({ value }) {
      const nonEmptyCodes = value.codes.filter((c) => c.trim() !== "");
      const id = generateId();
      const err = onSubmit({ id, ...value, codes: nonEmptyCodes, capitals: [], note: "" });
      setError(err);
    },
  });

  function addCode() {
    form.setFieldValue("codes", [...form.state.values.codes, ""]);
    set.code.add();
    setError((errors) => [...errors, ""]);
  }

  function removeCode(index: number) {
    form.setFieldValue(
      "codes",
      form.state.values.codes.filter((_, i) => i !== index),
    );
    setError((errors) => errors.filter((_, i) => i !== index));
    set.code.remove(index);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-2 grow shrink p-1 basis-0 overflow-y-auto"
    >
      {/* Codes */}
      <fieldset className="flex flex-col gap-1 w-full">
        <span>Kode:</span>
        {form.state.values.codes.map((_, i) => (
          <form.Field key={i} name={`codes[${i}]`}>
            {(field) => (
              <div className="flex gap-1 items-center">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={field.state.value ?? ""}
                    onChange={(e) => {
                      field.handleChange(e.currentTarget.value);
                      set.code.edit(i, e.currentTarget.value);
                      setError((prev) => {
                        const next = [...prev];
                        next[i] = "";
                        return next;
                      });
                    }}
                    aria-autocomplete="list"
                    placeholder="Kode / Barcode"
                  />
                  <TextError>{error[i]}</TextError>
                </div>
                {form.state.values.codes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCode(i)}
                    className="text-red-500 hover:text-red-700 shrink-0 px-1 cursor-pointer"
                    aria-label={`Hapus kode ${i + 1}`}
                  >
                    &#215;
                  </button>
                )}
              </div>
            )}
          </form.Field>
        ))}
        <button
          type="button"
          onClick={addCode}
          className="text-xs text-blue-600 hover:text-blue-800 self-start cursor-pointer"
        >
          + Tambah Kode
        </button>
      </fieldset>

      {/* Name */}
      <form.Field name="name">
        {(field) => (
          <Field>
            <span>Nama*:</span>
            <Input
              required
              id={`input-${field.name}`}
              name={field.name}
              value={field.state.value}
              onChange={(e) => {
                field.handleChange(e.currentTarget.value);
                set.name(e.currentTarget.value);
              }}
              onBlur={field.handleBlur}
              aria-autocomplete="list"
              placeholder="Nama produk"
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>

      {/* Price */}
      <form.Field name="price">
        {(field) => (
          <Field>
            <span>Harga*:</span>
            <div className="flex items-center gap-1">
              <p className="text-2xl">Rp</p>
              <Input
                required
                type="number"
                step="off"
                id={`input-${field.name}`}
                name={field.name}
                value={field.state.value === 0 ? "" : field.state.value}
                onChange={(e) => {
                  const num = Number(e.currentTarget.value);
                  if (isNaN(num) || num < 0) return;
                  field.handleChange(num);
                  set.price(num);
                }}
                onBlur={field.handleBlur}
                aria-autocomplete="list"
                placeholder="0"
              />
            </div>
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>

      {/* Qty */}
      <form.Field name="qty">
        {(field) => (
          <Field>
            <span>Kuantitas*:</span>
            <Input
              required
              type="number"
              step="off"
              id={`input-${field.name}`}
              name={field.name}
              value={field.state.value === 0 ? "" : field.state.value}
              onChange={(e) => {
                const num = Number(e.currentTarget.value);
                if (isNaN(num) || num < 0) return;
                field.handleChange(num);
                set.qty(num);
              }}
              onBlur={field.handleBlur}
              aria-autocomplete="list"
              placeholder="0"
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            Tambahkan
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
