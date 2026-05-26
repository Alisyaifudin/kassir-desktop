import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";

const schema = z.object({ count: z.number().int().min(0) });

export function count(timestamp: number, token: string) {
  return reqwest(genURL(`/api/record/count/${timestamp}`), schema, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
