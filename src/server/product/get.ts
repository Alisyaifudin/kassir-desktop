import { Effect } from "effect";
import { z } from "zod";
import { log } from "~/lib/log";
import { reqwest } from "~/lib/reqwest";
import { responseError } from "~/lib/response";
import { genURL } from "~/lib/url";

const schema = z
  .object({
    id: z.string().nonempty().max(100),
    name: z.string().max(100),
    barcode: z.string().max(100).optional(),
    price: z.number().max(1e9).min(0),
    stock: z.number().max(1e6).min(-1e6),
    capital: z.number().max(1e9).min(0),
    note: z.string().max(1000),
    updatedAt: z.number().int().max(1e14).min(0),
  })
  .array();

export type ProductServer = z.infer<typeof schema>[number];

export function get(timestamp: number) {
  return reqwest(genURL(`/api/product/${timestamp}`), schema).pipe(
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
