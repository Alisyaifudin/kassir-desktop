import { createFormHookContexts } from "@tanstack/react-form";
import { z } from "zod";

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

export type Product = {
  name: string;
  price: number;
  codes: string[];
  capitals: { capital: number; stock: number }[];
  note: string;
};

const numeric = z.string().refine((v) => {
  const num = Number(v);
  return !isNaN(num) && isFinite(num);
}, "Harus angka");

const integer = numeric.refine((v) => {
  const num = Number(v);
  return Number.isInteger(num);
}, "Harus bulat");

const schema = z.object({
  name: z.string().trim().nonempty("Harus ada"),
  price: numeric,
  codes: z.array(z.string().trim()),
  capitals: z.array(
    z.object({
      capital: numeric,
      stock: integer,
    }),
  ),
  note: z.string().trim(),
});

export type FormSchema = typeof schema;

export function createProductOptions({
  onSubmit,
  onError,
  onSuccess,
  product,
}: {
  onSubmit: (product: Product) => Promise<string | null>;
  onSuccess: () => void;
  onError: (error: string) => void;
  product?: Product;
}) {
  return {
    defaultValues: {
      name: product?.name ?? "",
      price: product?.price.toString() ?? "",
      codes: product?.codes ?? ([] as string[]),
      capitals:
        product?.capitals.map((c) => ({
          capital: c.capital.toString(),
          stock: c.stock.toString(),
        })) ?? ([] as { capital: string; stock: string }[]),
      note: product?.note ?? "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }: { value: z.infer<typeof schema> }) {
      const name = value.name.trim();
      const price = Number(value.price);
      const note = value.note.trim();
      const codes = value.codes.filter((c) => c.trim() !== "");
      const capitals = value.capitals.map((c) => ({
        capital: Number(c.capital),
        stock: Number(c.stock),
      }));
      const errMsg = await onSubmit({ name, price, note, codes, capitals });
      if (errMsg === null) {
        onSuccess();
      } else {
        onError(errMsg);
      }
    },
  };
}
