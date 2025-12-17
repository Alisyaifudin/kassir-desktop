import { redirect } from "react-router";
import { z } from "zod";
import { db } from "~/database";
import { integer, numeric } from "~/lib/utils";

const schema = z.object({
  name: z.string().min(1),
  price: numeric,
  stock: integer,
  stockBack: z.coerce.number().int(), // if empty, force to 0
  capital: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)))
    .transform((v) => (v === "" ? 0 : Number(v))),
  barcode: z.string().transform((v) => (v === "" ? null : v)),
  note: z.string(),
});

export async function editAction(id: number, formdata: FormData, backUrl: string) {
  const parsed = schema.safeParse({
    name: formdata.get("name"),
    price: formdata.get("price"),
    stock: formdata.get("stock"),
    stockBack: formdata.get("stock-back"),
    capital: formdata.get("capital"),
    barcode: formdata.get("barcode"),
    note: formdata.get("note"),
  });
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      name: errs.name?.join("; "),
      price: errs.price?.join("; "),
      stock: errs.stock?.join("; "),
      stockBack: errs.stockBack?.join("; "),
      capital: errs.capital?.join("; "),
      barcode: errs.barcode?.join("; "),
      note: errs.note?.join("; "),
    };
  }
  const data = parsed.data;
  const errMsg = await db.product.update.detail({ ...data, id });
  switch (errMsg) {
    case "Aplikasi bermasalah":
      return { global: errMsg };
    case "Barang dengan kode tersebut sudah ada":
      return { barcode: errMsg };
  }
  throw redirect(backUrl);
}
