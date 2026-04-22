import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z
  .object({
    id: z.string().nonempty().max(100),
    createdAt: z.number().int().max(1e14).min(0),
    productId: z.number().int().max(1e14).min(0),
    type: z.enum(["manual", "inc", "dec"]),
    value: z.number().min(0).max(1e6).int(),
  })
  .array();

export type ProductEventServer = z.infer<typeof schema>[number];

export function get(productId: string, token: string) {
  return reqwest(genURL(`/api/product-event/${productId}`), schema, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
