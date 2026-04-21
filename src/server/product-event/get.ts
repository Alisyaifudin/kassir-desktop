import { Effect } from "effect";
import { z } from "zod";
import { log } from "~/lib/log";
import { reqwest } from "~/lib/reqwest";
import { responseError } from "~/lib/response";
import { genURL } from "~/lib/url";

const schema = z
  .object({
    id: z.string().nonempty().max(100),
    createdAt: z.number().int().max(1e14).min(0),
    productId: z.number().int().max(1e14).min(0),
    type: z.enum(["manual", "inc", "dec"]),
    value: z.number().min(0).max(1e6).int(),
  })
  .array();

export function get(timestamp: number) {
  return reqwest(genURL(`/api/product-event/${timestamp}`), schema).pipe(
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
