import { Effect } from "effect";
import { z } from "zod";
import { log } from "~/lib/log";
import { reqwest } from "~/lib/reqwest";
import { responseError } from "~/lib/response";
import { genURL } from "~/lib/url";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  records: z.string().nonempty().max(100).array(),
  products: z.string().nonempty().max(100).array(),
});

export function del(graves: { products: string[]; records: string[] }) {
  return reqwest(genURL("/api/grave"), schema, {
    method: "DELETE",
    body: JSON.stringify(graves),
  }).pipe(
    Effect.catchAll((e) => {
      switch (e._tag) {
        case "BodyError":
        case "RequestError":
        case "ZodSchemaError":
          log.error(e.error);
          return Effect.fail(e.error.message);
        case "ResponseError":
          return responseError.failMsg(e);
      }
    }),
  );
}
