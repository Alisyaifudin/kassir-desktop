import { z } from "zod";
import { Product } from "~/database/product/cache";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  failed: z.string().nonempty().max(100).array(),
});

export function post(products: Product[], token: string) {
  return reqwest(genURL("/api/product"), schema, {
    method: "POST",
    body: JSON.stringify(products),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}
