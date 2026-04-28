import { z } from "zod";
import { reqwest } from "~/lib/reqwest";
import { genURL } from "~/lib/url";
import { MethodServer } from "./get";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  failed: z.string().nonempty().max(100).array(),
});

export function post(methods: MethodServer[], token: string) {
  return reqwest(genURL("/api/method"), schema, {
    method: "POST",
    body: JSON.stringify(methods),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
