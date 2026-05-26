import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z
  .object({
    id: z.string().nonempty().max(100),
    name: z.string().max(100),
    barcode: z.string().max(100).optional(),
    price: z.number().max(1e9).min(0),
    stock: z.number().max(1e6).min(-1e6),
    capital: z.number().max(1e9).min(0),
    note: z.string().max(1000),
    updatedAt: z.number().int().max(1e14).min(0),
  })
  .array();

export type ProductServer = z.infer<typeof schema>[number];

export function get(timestamp: number, token: string) {
  return reqwest(genURL(`/api/product/${timestamp}`), schema, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
