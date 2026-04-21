import { Effect } from "effect";
import { z } from "zod";
import { log } from "~/lib/log";
import { reqwest } from "~/lib/reqwest";
import { responseError } from "~/lib/response";
import { genURL } from "~/lib/url";

const schema = z.object({
  products: z.string().nonempty().max(100).array(),
  records: z.string().nonempty().max(100).array(),
});

export function get(timestamp: number) {
  return reqwest(genURL(`/api/grave/${timestamp}`), schema).pipe(
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
