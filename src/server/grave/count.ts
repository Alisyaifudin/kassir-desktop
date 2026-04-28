import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({
  products: z.number().int().min(0),
  records: z.number().int().min(0),
});

export function count(timestamp: number, token: string) {
  return reqwest(genURL(`/api/grave/count/${timestamp}`), schema, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
