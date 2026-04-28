import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({
  products: z.string().nonempty().max(100).array(),
  records: z.string().nonempty().max(100).array(),
});

export type GraveServer = z.infer<typeof schema>;

export function get(timestamp: number, token: string) {
  return reqwest(genURL(`/api/grave/${timestamp}`), schema, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
