import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";
import { RecordServer } from "./get";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  failed: z.string().nonempty().max(100).array(),
});

export function post(records: RecordServer[], token: string) {
  return reqwest(genURL("/api/record"), schema, {
    method: "POST",
    body: JSON.stringify(records),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
