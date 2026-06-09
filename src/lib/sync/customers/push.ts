import { Effect } from "effect";
import z from "zod";
import { server } from "~/server";
import { db } from "~/database/db";
import { SimpleResponseError, ZodSchemaError } from "~/lib/effect-error";
import { parseJson } from "~/lib/utils";

const responseBodySchema = z.object({
  timestamp: z.number().min(0).max(1e16),
  failedIds: z.string().nonempty().max(100).array(),
});

export function push(token: string, uploadCount: (currentSize: number, totalSize: number) => void) {
  return Effect.gen(function* () {
    const customers = yield* db.customer.get.allUnsync();
    const response = yield* server.customer.post(token, customers, uploadCount);
    if (response.status >= 400) {
      return yield* SimpleResponseError.fail(response);
    }
    const json = yield* parseJson(response.body);
    const parsed = z.safeParse(responseBodySchema, json);
    if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
    const { timestamp, failedIds } = parsed.data;
    const failedSet = new Set(failedIds);
    const successDeletedIds = customers.deleted.flatMap(({ id }) =>
      failedSet.has(id) ? [] : [id],
    );
    const successExistIds = customers.exist.flatMap(({ id }) => (failedSet.has(id) ? [] : [id]));
    yield* Effect.all(
      [
        db.customer.sync.update.many.syncAt(successDeletedIds, timestamp),
        db.customer.sync.update.many.syncAt(successExistIds, timestamp),
      ],
      { concurrency: "unbounded" },
    );
  });
}
