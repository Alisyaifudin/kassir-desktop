import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const extraSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().nonempty().max(100),
  value: z.number().min(-1e9).max(1e9),
  eff: z.number().min(-1e9).max(1e9),
  kind: z.enum(["number", "percent"]),
});

const discountSchema = z.object({
  id: z.string().nonempty().max(100),
  value: z.number().min(0).max(1e9),
  eff: z.number().min(0).max(1e9),
  kind: z.enum(["number", "percent", "pcs"]),
});

const productSchema = z.object({
  id: z.string().nonempty().max(100),
  productId: z.string().nonempty().max(100).optional(),
  name: z.string().nonempty().max(100),
  price: z.number().min(0).max(1e9),
  qty: z.number().min(-1e6).max(1e6).int(),
  capital: z.number().min(-1e9).max(1e9),
  capitalRaw: z.number().min(-1e9).max(1e9),
  total: z.number().min(0).max(1e9),
  discounts: discountSchema.array(),
});

const recordSchema = z.object({
  id: z.string().nonempty().max(100),
  updatedAt: z.number().int().max(1e14).min(0),
  paidAt: z.number().int().max(1e14).min(0),
  rounding: z.number().min(-1e9).max(1e9),
  isCredit: z.boolean(),
  cashier: z.string().nonempty().max(100),
  mode: z.enum(["buy", "sell"]),
  pay: z.number().min(0),
  methodId: z.string().nonempty().max(100),
  note: z.string().max(1000),
  fix: z.number().min(0).max(10).int(),
  customer: z.object({
    name: z.string().max(100),
    phone: z.string().max(100),
  }),
  subtotal: z.number().min(0).max(1e9),
  total: z.number().min(0).max(1e9),
  products: productSchema.array(),
  extras: extraSchema.array(),
});

export type RecordServer = z.infer<typeof recordSchema>;

export function get(timestamp: number, token: string) {
  return reqwest(genURL(`/api/record/${timestamp}`), recordSchema.array(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
