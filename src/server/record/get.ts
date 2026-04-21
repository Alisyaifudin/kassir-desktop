import { Effect } from "effect";
import { z } from "zod";
import { log } from "~/lib/log";
import { reqwest } from "~/lib/reqwest";
import { responseError } from "~/lib/response";
import { genURL } from "~/lib/url";

const extraSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().nonempty().max(100),
  value: z.number().min(0).max(1e9),
  eff: z.number().min(0).max(1e9),
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
  capital: z.number().min(0).max(1e9),
  capitalRaw: z.number().min(0).max(1e9),
  total: z.number().min(0).max(1e9),
  discounts: discountSchema.array(),
});

const recordSchema = z.object({
  id: z.string().nonempty().max(100),
  updatedAt: z.number().int().max(1e14).min(0),
  paidAt: z.number().int().max(1e14).min(0),
  rounding: z.number().min(0).max(1e9),
  isCredit: z.boolean(),
  cashier: z.string().nonempty().max(100),
  mode: z.enum(["buy", "sell"]),
  pay: z.number().min(0).max(1e9),
  note: z.string().max(100),
  methodId: z.number().min(0).max(1e6).int(),
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

export type Record = z.infer<typeof recordSchema>;

export function get(timestamp: number) {
  return reqwest(genURL(`/api/record/${timestamp}`), recordSchema.array()).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "BodyError":
        case "RequestError":
        case "ZodSchemaError":
          log.error(e.error);
          return Effect.fail(e.error.message);
        case "ResponseError":
          return responseError.failMsg(e);
      }
    }),
  );
}
