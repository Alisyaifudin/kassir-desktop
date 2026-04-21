import { Effect } from "effect";
import { z } from "zod";
import { Product } from "~/database/product/cache";
import { log } from "~/lib/log";
import { reqwest } from "~/lib/reqwest";
import { responseError } from "~/lib/response";
import { genURL } from "~/lib/url";

const schema = z.object({
  timestamp: z.number().int().max(1e14).min(0),
  failed: z.string().nonempty().max(100).array(),
});

export function post(products: Product[]) {
  return reqwest(genURL("/api/product"), schema, {
    method: "POST",
    body: JSON.stringify(products),
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
