import { z } from "zod";
import { ProductEvent } from "~/database/product-event/get-events";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  failedIds: z.string().nonempty().max(100).array(),
});

export function post(events: ProductEvent[], token: string) {
  return reqwest(genURL("/api/product-event"), schema, {
    method: "POST",
    body: JSON.stringify(events),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
