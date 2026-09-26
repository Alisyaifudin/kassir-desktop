import { createFormHookContexts } from "@tanstack/react-form";
import { Effect } from "effect";
import { z } from "zod";

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

type Product = {
  barcode?: string;
  name: string;
  price: number;
  stock: number;
  capital: number;
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
  capital: numeric,
  stock: integer,
  barcode: z.string().trim(),
  note: z.string().trim(),
});

type Input = z.infer<typeof schema>;

export function createProductOptions({
  program,
  onError,
  onSuccess,
  product,
}: {
  program: (product: Product) => Effect.Effect<string | null>;
  onSuccess: () => void;
  onError: (error: string) => void;
  product?: Product;
}) {
  return {
    defaultValues: {
      name: product?.name ?? "",
      price: product?.price.toString() ?? "",
      capital: product?.capital.toString() ?? "",
      stock: product?.stock.toString() ?? "",
      barcode: product?.barcode ?? "",
      note: product?.note ?? "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }: { value: Input }) {
      const price = Number(value.price);
      const capital = Number(value.capital);
      const stock = Number(value.stock);
      const name = value.name.trim();
      const barcodeStr = value.barcode.trim();
      const barcode = barcodeStr === "" ? undefined : barcodeStr;
      const note = value.note.trim();
      const errMsg = await Effect.runPromise(
        program({ capital, name, note, price, stock, barcode }),
      );
      if (errMsg === null) {
        onSuccess();
      } else {
        onError(errMsg);
      }
    },
  };
}
