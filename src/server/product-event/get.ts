import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({
  id: z.string().nonempty().max(100),
  createdAt: z.number().int().max(1e14).min(0),
  productId: z.string().nonempty().max(100),
  type: z.enum(["manual", "inc", "dec"]),
  value: z.number().min(-1e6).max(1e6).int(),
});

export type ProductEventServer = z.infer<typeof schema>;

export function get(productIds: string[], token: string, timestamp: number) {
  return reqwest(genURL(`/api/product-event/${timestamp}`), schema.array(), {
    body: JSON.stringify(productIds),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}
