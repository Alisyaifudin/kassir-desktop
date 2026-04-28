import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  records: z.string().nonempty().max(100).array(),
  products: z.string().nonempty().max(100).array(),
});

export function del(graves: { products: string[]; records: string[] }, token: string) {
  return reqwest(genURL("/api/grave"), schema, {
    method: "DELETE",
    body: JSON.stringify(graves),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
